import { Module } from "@nestjs/common";
import { WebhookDeliveryWorker } from "./webhook-delivery.worker.js";
import { WebhookSecretBox } from "./webhook-secret-box.js";
import { WebhooksController } from "./webhooks.controller.js";
import { WebhooksService } from "./webhooks.service.js";

@Module({
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhookSecretBox, WebhookDeliveryWorker],
})
export class WebhooksModule {}
