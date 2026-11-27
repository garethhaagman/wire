/** Re-export for span enrichment in Nest interceptors/filters. */
export { SpanStatusCode, trace } from "@opentelemetry/api";
export { isLogLevel, LOG_LEVELS, type LogLevel } from "./levels.js";
export {
  type CreateLoggerOptions,
  createPinoLogger,
  PinoNestLogger,
} from "./logger.js";
export {
  shutdownTelemetry,
  startTelemetry,
  type TelemetryOptions,
} from "./telemetry.js";
