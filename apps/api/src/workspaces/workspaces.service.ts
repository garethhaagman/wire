import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { WorkspacesRepository, WorkspaceEntity, type ListWorkspacesResult } from "@wire/db";
import type { Repository } from "typeorm";
import type { CreateWorkspaceRequest, Workspace } from "@wire/types";

@Injectable()
export class WorkspacesService {
  private readonly repo: WorkspacesRepository;

  constructor(@InjectRepository(WorkspaceEntity) repo: Repository<WorkspaceEntity>) {
    this.repo = new WorkspacesRepository(repo);
  }

  list(orgId: string, page: number, perPage: number): Promise<ListWorkspacesResult> {
    return this.repo.list(orgId, { page, perPage });
  }

  async getById(orgId: string, id: string): Promise<Workspace> {
    const workspace = await this.repo.findById(orgId, id);
    if (!workspace) {
      throw new NotFoundException(`No workspace with id ${id}`);
    }
    return workspace;
  }

  create(orgId: string, input: CreateWorkspaceRequest): Promise<Workspace> {
    return this.repo.create(orgId, input);
  }
}
