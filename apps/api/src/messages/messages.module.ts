import { Module } from "@nestjs/common";
import { AgentRunnerModule } from "../agents/agent-runner.module.js";
import { MessagesController } from "./messages.controller.js";
import { MessagesService } from "./messages.service.js";

@Module({
  imports: [AgentRunnerModule],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
