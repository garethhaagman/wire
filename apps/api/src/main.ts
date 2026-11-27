import "./instrumentation.js";

import { WsAdapter } from "@nestjs/platform-ws";
import { createPinoLogger, PinoNestLogger } from "@wire/observability";
import { createApp } from "./create-app.js";
import { instrumentationEnv, stopTelemetry } from "./instrumentation.js";

async function bootstrap(): Promise<void> {
  const env = instrumentationEnv;

  const pino = createPinoLogger({
    level: env.LOG_LEVEL,
    pretty: env.NODE_ENV !== "production",
    service: env.OTEL_SERVICE_NAME,
  });
  const nestLogger = PinoNestLogger.overrideNestLogger(pino);

  const app = await createApp({ logger: nestLogger });
  app.useWebSocketAdapter(new WsAdapter(app));

  await app.init();
  await app.listen(env.PORT, "0.0.0.0");

  const base = `http://localhost:${env.PORT}`;
  nestLogger.log(`wire api listening at ${base}`, "Bootstrap");
  if (env.NODE_ENV !== "production") {
    nestLogger.log(`api docs available at ${base}/docs`, "Bootstrap");
  }

  const shutdown = async (signal: string): Promise<void> => {
    nestLogger.log(`shutting down (${signal})`, "Bootstrap");
    await app.close();
    await stopTelemetry();
  };

  process.once("SIGINT", () => {
    void shutdown("SIGINT").finally(() => process.exit(0));
  });
  process.once("SIGTERM", () => {
    void shutdown("SIGTERM").finally(() => process.exit(0));
  });
}

bootstrap().catch((err: unknown) => {
  // Logger may not exist yet if env parse failed.
  console.error(err);
  process.exitCode = 1;
});
