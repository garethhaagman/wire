import { randomBytes } from "node:crypto";
import { Injectable, NotFoundException } from "@nestjs/common";
import type { CreateMemberRequest, Member } from "@wire/types";
import { InMemoryStore } from "../common/mock/in-memory-store.js";

/**
 * Dummy/mock service — in-memory only, no persistence. Real implementation per
 * internal-docs/product/04-implementation-roadmap.md Phase 1.
 */
@Injectable()
export class MembersService {
  private readonly store = new InMemoryStore<Member>();

  list(page: number, perPage: number): { items: Member[]; total: number } {
    return this.store.list(page, perPage);
  }

  getById(id: string): Member {
    const member = this.store.findById(id);
    if (!member) {
      throw new NotFoundException(`No member with id ${id}`);
    }
    return member;
  }

  /** Used by the permissions guard to resolve a session's role in a workspace. */
  findByEmail(workspaceId: string, email: string): Member | null {
    return this.store.findOne((m) => m.workspaceId === workspaceId && m.email === email);
  }

  create(workspaceId: string, input: CreateMemberRequest): Member {
    const now = new Date().toISOString();
    return this.store.insert({
      id: `mem_${randomBytes(12).toString("hex")}`,
      workspaceId,
      displayName: input.displayName,
      email: input.email,
      role: input.role,
      createdAt: now,
      updatedAt: now,
    });
  }
}
