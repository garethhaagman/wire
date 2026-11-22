import { Module } from "@nestjs/common";
import { UiConfigController } from "./ui-config.controller.js";
import { UiConfigService } from "./ui-config.service.js";

@Module({
  controllers: [UiConfigController],
  providers: [UiConfigService],
})
export class UiConfigModule {}
