import { Module } from "@nestjs/common";
import { MessagesModule } from "../messages/messages.module.js";
import { ThreadsController } from "./threads.controller.js";

@Module({
  imports: [MessagesModule],
  controllers: [ThreadsController],
})
export class ThreadsModule {}
