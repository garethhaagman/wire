import { randomBytes } from "node:crypto";
import { Injectable, NotFoundException } from "@nestjs/common";
import type { Agent, CreateAgentRequest } from "@wire/types";
import { InMemoryStore } from "../common/mock/in-memory-store.js";

/**
 * Dummy/mock service — in-memory only, no persistence. Real implementation per
 * internal-docs/product/04-implementation-roadmap.md Phase 2.
 */
@Injectable()
export class AgentsService {
  private readonly store = new InMemoryStore<Agent>();

  list(page: number, perPage: number): { items: Agent[]; total: number } {
    return this.store.list(page, perPage);
  }

  getById(id: string): Agent {
    const agent = this.store.findById(id);
    if (!agent) {
      throw new NotFoundException(`No agent with id ${id}`);
    }
    return agent;
  }

  create(workspaceId: string, input: CreateAgentRequest): Agent {
    const now = new Date().toISOString();
    return this.store.insert({
      id: `agt_${randomBytes(12).toString("hex")}`,
      workspaceId,
      handle: input.handle,
      harnessId: input.harnessId,
      permissionSetId: null,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  }
}
