import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  claimInvitesByEmail,
  Database,
  findWorkspace,
  insertWorkspace,
  listWorkspacesForUser,
  updateWorkspace,
} from "@wire/db";
import type {
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  Workspace,
} from "@wire/types";
import type { RequestActor } from "../permissions/actor.js";
import { MemberResolverService } from "../permissions/member-resolver.service.js";

@Injectable()
export class WorkspacesService {
  constructor(
    @Inject(Database) private readonly db: Database,
    private readonly members: MemberResolverService
  ) {}

  /** Workspaces the caller belongs to; pending invites for their email are claimed first. */
  async list(
    actor: RequestActor,
    page: number,
    perPage: number
  ): Promise<{ items: Workspace[]; total: number }> {
    if (
      this.members.canClaim({
        id: actor.userId,
        email: actor.email,
        emailVerified: actor.emailVerified,
      })
    ) {
      const claimed = await claimInvitesByEmail(
        this.db,
        actor.userId,
        actor.email
      );
      await Promise.all(
        claimed.map((m) => this.members.invalidate(m.workspaceId, actor.userId))
      );
    }
    return listWorkspacesForUser(this.db.primary, actor.userId, page, perPage);
  }

  async getById(id: string): Promise<Workspace> {
    const workspace = await findWorkspace(this.db, id);
    if (!workspace) {
      throw new NotFoundException(`No workspace with id ${id}`);
    }
    return workspace;
  }

  /**
   * Skeleton-scope tenancy: org_id is the creating user's id (see
   * WorkspacesController). The creator becomes the owner member and joins #general
   * in the same transaction.
   */
  async create(
    actor: RequestActor,
    input: CreateWorkspaceRequest
  ): Promise<Workspace> {
    const { workspace } = await this.db.tx((tx) =>
      insertWorkspace(tx, {
        orgId: actor.userId,
        name: input.name,
        dataRegion: input.dataRegion,
        owner: {
          userId: actor.userId,
          email: actor.email,
          displayName: actor.name,
        },
      })
    );
    await this.members.invalidate(workspace.id, actor.userId);
    return workspace;
  }

  async update(id: string, input: UpdateWorkspaceRequest): Promise<Workspace> {
    const workspace = await updateWorkspace(this.db, id, input);
    if (!workspace) {
      throw new NotFoundException(`No workspace with id ${id}`);
    }
    return workspace;
  }
}
