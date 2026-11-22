import { type MiddlewareConsumer, Module, type NestModule } from "@nestjs/common";
import { EnvModule } from "./config/env.provider.js";
import { DatabaseModule } from "./database/database.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { HealthModule } from "./health/health.module.js";
import { WorkspacesModule } from "./workspaces/workspaces.module.js";
import { MembersModule } from "./members/members.module.js";
import { ChannelsModule } from "./channels/channels.module.js";
import { MessagesModule } from "./messages/messages.module.js";
import { AgentsModule } from "./agents/agents.module.js";
import { ThreadsModule } from "./threads/threads.module.js";
import { ReactionsModule } from "./reactions/reactions.module.js";
import { PinsModule } from "./pins/pins.module.js";
import { SearchModule } from "./search/search.module.js";
import { WebhooksModule } from "./webhooks/webhooks.module.js";
import { AuditModule } from "./audit/audit.module.js";
import { FilesModule } from "./files/files.module.js";
import { UiConfigModule } from "./ui-config/ui-config.module.js";
import { PermissionsModule } from "./permissions/permissions.module.js";
import { RequestIdMiddleware } from "./common/middleware/request-id.middleware.js";
import { RateLimitMiddleware } from "./common/middleware/rate-limit.middleware.js";

@Module({
  imports: [
    EnvModule,
    DatabaseModule,
    AuthModule,
    HealthModule,
    WorkspacesModule,
    MembersModule,
    ChannelsModule,
    MessagesModule,
    AgentsModule,
    ThreadsModule,
    ReactionsModule,
    PinsModule,
    SearchModule,
    WebhooksModule,
    AuditModule,
    FilesModule,
    UiConfigModule,
    PermissionsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware, RateLimitMiddleware).forRoutes("*");
  }
}
