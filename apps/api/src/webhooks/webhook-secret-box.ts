import { Inject, Injectable } from "@nestjs/common";
import type { ApiEnv } from "@wire/config";
import { SecretBox } from "../common/crypto/secret-box.js";
import { API_ENV } from "../config/env.provider.js";

@Injectable()
export class WebhookSecretBox extends SecretBox {
  constructor(@Inject(API_ENV) env: ApiEnv) {
    super(env.BETTER_AUTH_SECRET, "webhook-signing-secret");
  }
}
