import { Inject, Injectable } from "@nestjs/common";
import { type ApiEnv, resolveAppSecret } from "@wire/config";
import { SecretBox } from "../common/crypto/secret-box.js";
import { API_ENV } from "../config/env.provider.js";

@Injectable()
export class WebhookSecretBox extends SecretBox {
  constructor(@Inject(API_ENV) env: ApiEnv) {
    super(resolveAppSecret(env), "webhook-signing-secret");
  }
}
