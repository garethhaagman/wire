import { randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type { AuditEvent } from "@wire/types";
import { InMemoryStore } from "../common/mock/in-memory-store.js";

/**
 * Dummy/mock service — in-memory only, no persistence, not wired to other
 * modules' mutations yet. Real implementation records every mutating request
 * automatically (interceptor-level, not per-call) per
 * internal-docs/api/auth-tenancy.md § Audit log.
 */
@Injectable()
export class AuditService {
  private readonly store = new InMemoryStore<AuditEvent>();

  list(workspaceId: string, page: number, perPage: number): { items: AuditEvent[]; total: number } {
    const all = this.store
      .findAll((e) => e.workspaceId === workspaceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const start = (page - 1) * perPage;
    return { items: all.slice(start, start + perPage), total: all.length };
  }

  record(workspaceId: string, actorId: string, resource: string, action: string, agentRunId: string | null = null): AuditEvent {
    return this.store.insert({
      id: `aud_${randomBytes(12).toString("hex")}`,
      workspaceId,
      actorId,
      ip: null,
      resource,
      action,
      agentRunId,
      createdAt: new Date().toISOString(),
    });
  }
}
