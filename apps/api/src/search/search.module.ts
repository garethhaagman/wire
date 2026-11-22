import { Module } from "@nestjs/common";
import { MessagesModule } from "../messages/messages.module.js";
import { SearchController } from "./search.controller.js";
import { SearchService } from "./search.service.js";

@Module({
  imports: [MessagesModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
