import { Module } from "@nestjs/common";
import { AgentRunnerService } from "./agent-runner.service.js";

/**
 * Split out of AgentsModule so MessagesModule can trigger a run (via @handle mention
 * parsing) without importing AgentsModule itself — AgentRunnerService only needs
 * Database/env/the outbox relay, not AgentsService or AgentsController.
 */
@Module({
  providers: [AgentRunnerService],
  exports: [AgentRunnerService],
})
export class AgentRunnerModule {}
