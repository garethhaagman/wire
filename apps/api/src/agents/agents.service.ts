import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  appendEvents,
  Database,
  findAgent,
  insertAgent,
  isUniqueViolation,
  listAgents,
  updateAgent,
} from "@wire/db";
import type { Agent, CreateAgentRequest, UpdateAgentRequest } from "@wire/types";
import { ResourceConflictException } from "../common/errors/api-exception.js";
import { OutboxRelayService } from "../events/outbox-relay.service.js";
import type { WorkspaceActor } from "../permissions/actor.js";

/**
 * Agent records — identity and configuration. Execution (harnesses, runs) is
 * internal-docs/product/04-implementation-roadmap.md Phase 2.
 */
@Injectable()
export class AgentsService {
  constructor(
    @Inject(Database) private readonly db: Database,
    private readonly relay: OutboxRelayService,
  ) {}

  list(
    actor: WorkspaceActor,
    page: number,
    perPage: number,
  ): Promise<{ items: Agent[]; total: number }> {
    return listAgents(this.db, actor.workspaceId, page, perPage);
  }

  async getById(actor: WorkspaceActor, id: string): Promise<Agent> {
    const agent = await findAgent(this.db, actor.workspaceId, id);
    if (!agent) {
      throw new NotFoundException(`No agent with id ${id}`);
    }
    return agent;
  }

  async create(actor: WorkspaceActor, input: CreateAgentRequest): Promise<Agent> {
    const agent = await this.db
      .tx(async (tx) => {
        const created = await insertAgent(tx, {
          workspaceId: actor.workspaceId,
          handle: input.handle,
          harnessId: input.harnessId,
        });
        await appendEvents(tx, [
          {
            workspaceId: actor.workspaceId,
            type: "agent.created",
            channelId: null,
            data: { agent: created },
          },
        ]);
        return created;
      })
      .catch((err: unknown) => {
        if (isUniqueViolation(err, "UQ_agents_workspace_handle")) {
          throw new ResourceConflictException(
            `An agent with handle @${input.handle} already exists.`,
          );
        }
        throw err;
      });
    this.relay.kick();
    return agent;
  }

  async update(actor: WorkspaceActor, id: string, input: UpdateAgentRequest): Promise<Agent> {
    return this.write(actor, id, input);
  }

  /** Soft delete — the handle becomes reusable, the row stays for message provenance. */
  async remove(actor: WorkspaceActor, id: string): Promise<void> {
    await this.write(actor, id, { status: "deleted" });
  }

  private async write(
    actor: WorkspaceActor,
    id: string,
    patch: { harnessId?: string; status?: Agent["status"] },
  ): Promise<Agent> {
    const agent = await this.db.tx(async (tx) => {
      const updated = await updateAgent(tx, actor.workspaceId, id, patch);
      if (updated) {
        await appendEvents(tx, [
          {
            workspaceId: actor.workspaceId,
            type: "agent.updated",
            channelId: null,
            data: { agent: updated },
          },
        ]);
      }
      return updated;
    });
    if (!agent) {
      throw new NotFoundException(`No agent with id ${id}`);
    }
    this.relay.kick();
    return agent;
  }
}
