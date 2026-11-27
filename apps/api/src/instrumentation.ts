/**
 * Side-effect entry: start OpenTelemetry before any other app module loads so
 * auto-instrumentation can patch http/Express/pg/ioredis. Import this first
 * from main.ts (before create-app / Nest).
 */
import { parseApiEnv } from "@wire/config";
import { startTelemetry } from "@wire/observability";

const env = parseApiEnv();

export const stopTelemetry = startTelemetry({
  serviceName: env.OTEL_SERVICE_NAME,
  ...(env.OTEL_EXPORTER_OTLP_ENDPOINT
    ? { otlpEndpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT }
    : {}),
  disabled: env.OTEL_SDK_DISABLED,
});

export { env as instrumentationEnv };
