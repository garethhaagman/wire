import { randomBytes } from "node:crypto";
import type { Repository } from "typeorm";
import type { CreateWorkspaceRequest, Workspace } from "@wire/types";
import type { WorkspaceEntity } from "./workspace.entity.js";

function toWorkspace(entity: WorkspaceEntity): Workspace {
  return {
    id: entity.id as Workspace["id"],
    orgId: entity.orgId,
    name: entity.name,
    dataRegion: entity.dataRegion,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

export interface ListWorkspacesOptions {
  page: number;
  perPage: number;
}

export interface ListWorkspacesResult {
  items: Workspace[];
  total: number;
}

/**
 * Thin wrapper around the TypeORM repository so callers (apps/api) depend on
 * @wire/types shapes, not TypeORM's entity classes directly.
 */
export class WorkspacesRepository {
  constructor(private readonly repo: Repository<WorkspaceEntity>) {}

  async list(orgId: string, options: ListWorkspacesOptions): Promise<ListWorkspacesResult> {
    const [rows, total] = await this.repo.findAndCount({
      where: { orgId },
      order: { createdAt: "DESC" },
      skip: (options.page - 1) * options.perPage,
      take: options.perPage,
    });
    return { items: rows.map(toWorkspace), total };
  }

  async findById(orgId: string, id: string): Promise<Workspace | null> {
    const row = await this.repo.findOne({ where: { orgId, id } });
    return row ? toWorkspace(row) : null;
  }

  async create(orgId: string, input: CreateWorkspaceRequest): Promise<Workspace> {
    const entity = this.repo.create({
      id: `ws_${randomBytes(12).toString("hex")}`,
      orgId,
      name: input.name,
      dataRegion: input.dataRegion,
    });
    const saved = await this.repo.save(entity);
    return toWorkspace(saved);
  }
}
