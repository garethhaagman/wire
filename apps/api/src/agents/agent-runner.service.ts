import { Inject, Injectable, Logger } from "@nestjs/common";
import { generateText } from "ai";
import {
  appendEvents,
  Database,
  insertAgentRun,
  insertAgentRunStep,
  insertMessage,
  updateAgentRun,
} from "@wire/db";
import type { ApiEnv } from "@wire/config";
import type { Agent, AgentRun } from "@wire/types";
import { API_ENV } from "../config/env.provider.js";
import { OutboxRelayService } from "../events/outbox-relay.service.js";
import { selectModel } from "./model-selection.js";

interface TriggerRunInput {
  workspaceId: string;
  agent: Agent;
  prompt: string;
  channelId?: string | undefined;
  triggeredByMessageId?: string | undefined;
  context?: Record<string, unknown> | undefined;
}

/**
 * Orchestrates one agent run: persists the row, calls generateText() against the
 * env-selected model (selectModel.ts — real Claude when ANTHROPIC_API_KEY is set,
 * a deterministic mock otherwise), records a model_call/final step pair, then — if
 * the run has a channel — posts the reply as a message authored by the agent
 * (actorType "agent"). Runs asynchronously: callers get back the "queued" row
 * immediately and never block on the LLM call.
 *
 * Posts the reply with insertMessage directly rather than through MessagesService —
 * an agent has no WorkspaceActor/member row, so the human-authored post() path
 * (channel-membership auto-join, actor-owned read-cursor advance) doesn't apply.
 */
@Injectable()
export class AgentRunnerService {
  private readonly logger = new Logger(AgentRunnerService.name);

  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(API_ENV) private readonly env: ApiEnv,
    private readonly relay: OutboxRelayService,
  ) {}

  /** Creates the queued row, then kicks off execution in the background. Never throws from the background part. */
  async trigger(input: TriggerRunInput): Promise<AgentRun> {
    const run = await this.db.tx(async (tx) => {
      const created = await insertAgentRun(tx, {
        workspaceId: input.workspaceId,
        agentId: input.agent.id,
        triggeredByMessageId: input.triggeredByMessageId ?? null,
        channelId: input.channelId ?? null,
        input: { prompt: input.prompt, ...(input.context ? { context: input.context } : {}) },
      });
      await appendEvents(tx, [
        { workspaceId: input.workspaceId, type: "agent.run.created", channelId: input.channelId ?? null, data: { run: created } },
      ]);
      return created;
    });
    this.relay.kick();

    this.execute(run, input.agent).catch((err: unknown) => {
      this.logger.error(`agent run ${run.id} crashed outside its own error handling`, err);
    });

    return run;
  }

  private async execute(run: AgentRun, agent: Agent): Promise<void> {
    await updateAgentRun(this.db, run.id, { status: "running", startedAt: new Date() });

    try {
      const result = await generateText({ model: selectModel(this.env), prompt: run.input.prompt });

      await insertAgentRunStep(this.db, {
        runId: run.id,
        seq: 0,
        type: "model_call",
        data: { prompt: run.input.prompt, usage: result.usage },
      });
      await insertAgentRunStep(this.db, { runId: run.id, seq: 1, type: "final", data: { output: result.text } });

      const finished = await updateAgentRun(this.db, run.id, {
        status: "succeeded",
        output: result.text,
        finishedAt: new Date(),
      });

      if (run.channelId) {
        await this.postReply(run.workspaceId, run.channelId, agent, result.text);
      }

      await appendEvents(this.db, [
        { workspaceId: run.workspaceId, type: "agent.run.completed", channelId: run.channelId, data: { run: finished } },
      ]);
      this.relay.kick();
    } catch (err: unknown) {
      this.logger.error(`agent run ${run.id} failed`, err);
      const message = err instanceof Error ? err.message : "Unknown model error.";
      const failed = await updateAgentRun(this.db, run.id, { status: "failed", error: message, finishedAt: new Date() });
      await appendEvents(this.db, [
        { workspaceId: run.workspaceId, type: "agent.run.completed", channelId: run.channelId, data: { run: failed } },
      ]);
      this.relay.kick();
    }
  }

  private async postReply(workspaceId: string, channelId: string, agent: Agent, body: string): Promise<void> {
    await this.db.tx(async (tx) => {
      const result = await insertMessage(tx, {
        workspaceId,
        channelId,
        actorId: agent.id,
        actorType: "agent",
        body,
        threadRootId: null,
        broadcast: false,
      });
      if (!result.ok) {
        this.logger.warn(`agent ${agent.id} could not post to channel ${channelId}: ${result.reason}`);
        return;
      }
      await appendEvents(tx, [
        { workspaceId, type: "message.created", channelId, data: { message: result.message } },
      ]);
    });
    this.relay.kick();
  }
}
