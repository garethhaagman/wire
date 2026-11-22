import { ForbiddenException, HttpStatus, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  addChannelMembers,
  appendEvents,
  Database,
  deactivateMember,
  findDefaultChannelIds,
  findMember,
  findUserByEmail,
  getPreferences,
  isUniqueViolation,
  listMembers,
  lockActiveOwnerIds,
  mergePreferences,
  updateMember,
  upsertMember,
  type NewEvent,
} from "@wire/db";
import type {
  CreateMemberRequest,
  Member,
  MemberPreferences,
  UpdateMemberPreferencesRequest,
  UpdateMemberRequest,
} from "@wire/types";
import { ApiException, ResourceConflictException } from "../common/errors/api-exception.js";
import { OutboxRelayService } from "../events/outbox-relay.service.js";
import { isAdmin, type WorkspaceActor } from "../permissions/actor.js";
import { MemberResolverService } from "../permissions/member-resolver.service.js";

@Injectable()
export class MembersService {
  constructor(
    @Inject(Database) private readonly db: Database,
    private readonly resolver: MemberResolverService,
    private readonly relay: OutboxRelayService,
  ) {}

  list(actor: WorkspaceActor, page: number, perPage: number, search?: string): Promise<{ items: Member[]; total: number }> {
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
  async create(actor: WorkspaceActor, input: CreateMemberRequest): Promise<Member> {
    if (input.role === "owner" && actor.member.role !== "owner") {
      throw new ForbiddenException("Only an owner can invite another owner.");
    }

    const user = await findUserByEmail(this.db, input.email);
    const userId =
      user && this.resolver.canClaim({ id: user.id, email: input.email, emailVerified: user.emailVerified }) ? user.id : null;

    const member = await this.db
      .tx(async (tx) => {
        const created = await upsertMember(tx, {
          workspaceId: actor.workspaceId,
          email: input.email,
          displayName: input.displayName,
          role: input.role,
          userId,
        });
        if (!created) return null;

        const events: NewEvent[] = [
          { workspaceId: actor.workspaceId, type: "member.joined", channelId: null, data: { member: created } },
        ];
        for (const channelId of await findDefaultChannelIds(tx, actor.workspaceId)) {
          const joined = await addChannelMembers(tx, channelId, actor.workspaceId, [created.id]);
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
        if (isUniqueViolation(err)) return null;
        throw err;
      });

    if (!member) {
      throw new ResourceConflictException(`${input.email} is already a member of this workspace.`);
    }
    this.relay.kick();
    await this.resolver.invalidate(actor.workspaceId, member.userId);
    return member;
  }

  /** Members may edit their own display name; changing roles (or anyone else) is admin-only. */
  async update(actor: WorkspaceActor, id: string, input: UpdateMemberRequest): Promise<Member> {
    const self = id === actor.member.id;
    if (!isAdmin(actor) && (!self || input.role !== undefined)) {
      throw new ApiException("PERMISSION_DENIED", "Members can only update their own display name.", HttpStatus.FORBIDDEN);
    }

    const member = await this.db.tx(async (tx) => {
      const target = await findMember(tx, actor.workspaceId, id);
      if (!target) return null;

      if (input.role !== undefined && input.role !== target.role) {
        const touchesOwner = input.role === "owner" || target.role === "owner";
        if (touchesOwner && actor.member.role !== "owner") {
          throw new ForbiddenException("Only an owner can grant or revoke the owner role.");
        }
        if (target.role === "owner") {
          const owners = await lockActiveOwnerIds(tx, actor.workspaceId);
          if (owners.length <= 1) {
            throw new ResourceConflictException("A workspace must keep at least one owner.");
          }
        }
      }

      const updated = await updateMember(tx, actor.workspaceId, id, input);
      if (updated) {
        await appendEvents(tx, [
          { workspaceId: actor.workspaceId, type: "member.updated", channelId: null, data: { member: updated } },
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
      if (!target) return null;
      if (target.role === "owner") {
        if (actor.member.role !== "owner") throw new ForbiddenException("Only an owner can remove an owner.");
        const owners = await lockActiveOwnerIds(tx, actor.workspaceId);
        if (owners.length <= 1) throw new ResourceConflictException("A workspace must keep at least one owner.");
      }

      const member = await deactivateMember(tx, actor.workspaceId, id);
      if (member) {
        await appendEvents(tx, [
          { workspaceId: actor.workspaceId, type: "member.removed", channelId: null, data: { memberId: member.id } },
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

  updatePreferences(actor: WorkspaceActor, input: UpdateMemberPreferencesRequest): Promise<MemberPreferences> {
    const patch: Partial<MemberPreferences> = {};
    if (input.starredChannelIds) patch.starredChannelIds = [...new Set(input.starredChannelIds)];
    if (input.mutedChannelIds) patch.mutedChannelIds = [...new Set(input.mutedChannelIds)];
    return mergePreferences(this.db, actor.member.id, patch);
  }
}
