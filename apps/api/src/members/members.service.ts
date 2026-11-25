import {
  ForbiddenException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { ApiEnv } from "@wire/config";
import {
  addChannelMembers,
  appendEvents,
  Database,
  deactivateMember,
  findDefaultChannelIds,
  findMember,
  findUserByEmail,
  findWorkspace,
  getPreferences,
  isUniqueViolation,
  listMembers,
  lockActiveOwnerIds,
  mergePreferences,
  type NewEvent,
  updateMember,
  upsertMember,
} from "@wire/db";
import type {
  CreateMemberRequest,
  Member,
  MemberPreferences,
  UpdateMemberPreferencesRequest,
  UpdateMemberRequest,
} from "@wire/types";
import {
  ApiException,
  ResourceConflictException,
} from "../common/errors/api-exception.js";
import { API_ENV } from "../config/env.provider.js";
import { selectEmailSender } from "../email/select-email-sender.js";
import { OutboxRelayService } from "../events/outbox-relay.service.js";
import { isAdmin, type WorkspaceActor } from "../permissions/actor.js";
import { MemberResolverService } from "../permissions/member-resolver.service.js";

const HTML_ESCAPE_PATTERN = /[&<>"']/gu;
const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Workspace names are user-controlled; escape before interpolating into an HTML email body. */
function escapeHtml(value: string): string {
  return value.replace(
    HTML_ESCAPE_PATTERN,
    (char) => HTML_ESCAPES[char] ?? char
  );
}

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);

  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(API_ENV) private readonly env: ApiEnv,
    private readonly resolver: MemberResolverService,
    private readonly relay: OutboxRelayService
  ) {}

  list(
    actor: WorkspaceActor,
    page: number,
    perPage: number,
    search?: string
  ): Promise<{ items: Member[]; total: number }> {
    return listMembers(this.db, actor.workspaceId, { page, perPage, search });
  }

  async getById(actor: WorkspaceActor, id: string): Promise<Member> {
    const member = await findMember(this.db, actor.workspaceId, id);
    if (!member) {
      throw new NotFoundException(`No member with id ${id}`);
    }
    return member;
  }

  /**
   * Invites by email. If a user with that (verified, per claim policy) email
   * already exists the membership is bound immediately; otherwise it's claimed on
   * their first sign-in. New members join the workspace's default channels in the
   * same transaction.
   */
  async create(
    actor: WorkspaceActor,
    input: CreateMemberRequest
  ): Promise<Member> {
    if (input.role === "owner" && actor.member.role !== "owner") {
      throw new ForbiddenException("Only an owner can invite another owner.");
    }

    const user = await findUserByEmail(this.db, input.email);
    const userId =
      user &&
      this.resolver.canClaim({
        id: user.id,
        email: input.email,
        emailVerified: user.emailVerified,
      })
        ? user.id
        : null;

    const member = await this.db
      .tx(async (tx) => {
        const created = await upsertMember(tx, {
          workspaceId: actor.workspaceId,
          email: input.email,
          displayName: input.displayName,
          role: input.role,
          userId,
        });
        if (!created) {
          return null;
        }

        const events: NewEvent[] = [
          {
            workspaceId: actor.workspaceId,
            type: "member.joined",
            channelId: null,
            data: { member: created },
          },
        ];
        for (const channelId of await findDefaultChannelIds(
          tx,
          actor.workspaceId
        )) {
          // biome-ignore lint/performance/noAwaitInLoops: queries on one transaction's connection can't run concurrently
          const joined = await addChannelMembers(
            tx,
            channelId,
            actor.workspaceId,
            [created.id]
          );
          if (joined.length) {
            events.push({
              workspaceId: actor.workspaceId,
              type: "channel.member.joined",
              channelId,
              data: { channelId, memberId: created.id },
            });
          }
        }
        await appendEvents(tx, events);
        return created;
      })
      .catch((err: unknown) => {
        if (isUniqueViolation(err)) {
          return null;
        }
        throw err;
      });

    if (!member) {
      throw new ResourceConflictException(
        `${input.email} is already a member of this workspace.`
      );
    }
    this.relay.kick();
    await this.resolver.invalidate(actor.workspaceId, member.userId);

    this.sendInviteEmail(actor.workspaceId, member).catch((err: unknown) => {
      this.logger.error(`invite email failed for member ${member.id}`, err);
    });

    return member;
  }

  /**
   * Fire-and-forget after the invite commits — never blocks member creation, never
   * retried on failure (a missed send just means the invitee doesn't get an email;
   * they can still be told directly or re-invited).
   */
  private async sendInviteEmail(
    workspaceId: string,
    member: Member
  ): Promise<void> {
    const workspace = await findWorkspace(this.db, workspaceId);
    const workspaceName = workspace?.name ?? "a Wire workspace";
    // No dedicated accept-invite page exists yet in apps/web — this links to the
    // web app's root with the workspace id, which is enough to land a signed-in or
    // sign-up flow in the right place today, but a real invite-accept route is a
    // frontend gap, not something this backend task builds.
    const link = `${this.env.WEB_ORIGIN}/?workspaceId=${encodeURIComponent(workspaceId)}`;
    const safeWorkspaceName = escapeHtml(workspaceName);

    await selectEmailSender(this.env)({
      to: member.email,
      subject: `You've been invited to ${workspaceName} on Wire`,
      text: `You've been invited to join ${workspaceName} on Wire. Sign in at ${link} to get started.`,
      html: `<p>You've been invited to join <strong>${safeWorkspaceName}</strong> on Wire.</p><p><a href="${link}">Sign in to get started</a>.</p>`,
    });
  }

  /** Members may edit their own display name; changing roles (or anyone else) is admin-only. */
  async update(
    actor: WorkspaceActor,
    id: string,
    input: UpdateMemberRequest
  ): Promise<Member> {
    const self = id === actor.member.id;
    if (!isAdmin(actor) && (!self || input.role !== undefined)) {
      throw new ApiException(
        "PERMISSION_DENIED",
        "Members can only update their own display name.",
        HttpStatus.FORBIDDEN
      );
    }

    const member = await this.db.tx(async (tx) => {
      const target = await findMember(tx, actor.workspaceId, id);
      if (!target) {
        return null;
      }

      if (input.role !== undefined && input.role !== target.role) {
        const touchesOwner = input.role === "owner" || target.role === "owner";
        if (touchesOwner && actor.member.role !== "owner") {
          throw new ForbiddenException(
            "Only an owner can grant or revoke the owner role."
          );
        }
        if (target.role === "owner") {
          const owners = await lockActiveOwnerIds(tx, actor.workspaceId);
          if (owners.length <= 1) {
            throw new ResourceConflictException(
              "A workspace must keep at least one owner."
            );
          }
        }
      }

      const updated = await updateMember(tx, actor.workspaceId, id, input);
      if (updated) {
        await appendEvents(tx, [
          {
            workspaceId: actor.workspaceId,
            type: "member.updated",
            channelId: null,
            data: { member: updated },
          },
        ]);
      }
      return updated;
    });

    if (!member) {
      throw new NotFoundException(`No member with id ${id}`);
    }
    this.relay.kick();
    await this.resolver.invalidate(actor.workspaceId, member.userId);
    return member;
  }

  async remove(actor: WorkspaceActor, id: string): Promise<void> {
    const removed = await this.db.tx(async (tx) => {
      const target = await findMember(tx, actor.workspaceId, id);
      if (!target) {
        return null;
      }
      if (target.role === "owner") {
        if (actor.member.role !== "owner") {
          throw new ForbiddenException("Only an owner can remove an owner.");
        }
        const owners = await lockActiveOwnerIds(tx, actor.workspaceId);
        if (owners.length <= 1) {
          throw new ResourceConflictException(
            "A workspace must keep at least one owner."
          );
        }
      }

      const member = await deactivateMember(tx, actor.workspaceId, id);
      if (member) {
        await appendEvents(tx, [
          {
            workspaceId: actor.workspaceId,
            type: "member.removed",
            channelId: null,
            data: { memberId: member.id },
          },
        ]);
      }
      return member;
    });

    if (!removed) {
      throw new NotFoundException(`No member with id ${id}`);
    }
    this.relay.kick();
    await this.resolver.invalidate(actor.workspaceId, removed.userId);
  }

  getPreferences(actor: WorkspaceActor): Promise<MemberPreferences> {
    return getPreferences(this.db, actor.member.id);
  }

  updatePreferences(
    actor: WorkspaceActor,
    input: UpdateMemberPreferencesRequest
  ): Promise<MemberPreferences> {
    const patch: Partial<MemberPreferences> = {};
    if (input.starredChannelIds) {
      patch.starredChannelIds = [...new Set(input.starredChannelIds)];
    }
    if (input.mutedChannelIds) {
      patch.mutedChannelIds = [...new Set(input.mutedChannelIds)];
    }
    return mergePreferences(this.db, actor.member.id, patch);
  }
}
