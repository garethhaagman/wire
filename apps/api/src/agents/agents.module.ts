import { Module } from "@nestjs/common";
import { AgentRunnerModule } from "./agent-runner.module.js";
import { AgentRunsController } from "./agent-runs.controller.js";
import { AgentsController } from "./agents.controller.js";
import { AgentsService } from "./agents.service.js";

@Module({
  imports: [AgentRunnerModule],
  controllers: [AgentsController, AgentRunsController],
  providers: [AgentsService],
})
export class AgentsModule {}
