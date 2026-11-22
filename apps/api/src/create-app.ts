import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory, Reflector } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { toNodeHandler } from "better-auth/node";
import { parseApiEnv } from "@wire/config";
import { AppModule } from "./app.module.js";
import { AUTH_INSTANCE } from "./auth/auth.module.js";
import type { Auth } from "./auth/auth.config.js";
import { ResponseEnvelopeInterceptor } from "./common/interceptors/response-envelope.interceptor.js";
import { DeprecationHeadersInterceptor } from "./common/interceptors/deprecation-headers.interceptor.js";
import { ApiExceptionFilter } from "./common/filters/api-exception.filter.js";
import { validationExceptionFactory } from "./common/pipes/validation-exception-factory.js";

/**
 * Builds and configures the Nest app without listening on a port — consumed by
 * main.ts (which also calls app.listen()) and scripts/export-openapi.ts (which
 * only needs SwaggerModule.createDocument()). Side-effect-free on import, unlike
 * main.ts which boots a listening server at module load.
 */
export async function createApp(): Promise<NestExpressApplication> {
  const env = parseApiEnv();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({ origin: env.WEB_ORIGIN, credentials: true });

  // Better Auth owns raw request/response for its routes; mount before Nest's JSON body
  // parser so the framework doesn't consume the request stream first.
  const auth = app.get<Auth>(AUTH_INSTANCE);
  app.use("/api/auth/*", toNodeHandler(auth));

  // Shared API infrastructure — every endpoint gets these for free, per
  // internal-docs/api/README.md § 13 (build conventions into the framework).
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(
    new ResponseEnvelopeInterceptor(),
    new DeprecationHeadersInterceptor(reflector),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );

  // Swagger UI is a dev/local convenience, never exposed in production.
  const swaggerEnabled = env.NODE_ENV !== "production";
  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("Wire API")
      .setVersion("0.1.0")
      .addCookieAuth("better-auth.session_token")
      .build();
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("docs", app, swaggerDocument);
  }

  return app;
}
