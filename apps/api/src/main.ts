import { parseApiEnv } from "@wire/config";
import { createApp } from "./create-app.js";

async function bootstrap(): Promise<void> {
  const env = parseApiEnv();
  const app = await createApp();

  await app.init();
  await app.listen(env.PORT, "0.0.0.0");

  const base = `http://localhost:${env.PORT}`;
  const swaggerEnabled = env.NODE_ENV !== "production";
  console.warn(`wire api listening at ${base}`);
  if (swaggerEnabled) {
    console.warn(`api docs available at ${base}/docs`);
  }
}

bootstrap().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
