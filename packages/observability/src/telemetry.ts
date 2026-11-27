import { DiagConsoleLogger, DiagLogLevel, diag } from "@opentelemetry/api";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

export interface TelemetryOptions {
  /** Mirror OTEL diag to console (noisy; off by default). */
  diagDebug?: boolean;
  /** When true, skip starting the SDK entirely (`OTEL_SDK_DISABLED`). */
  disabled?: boolean;
  /**
   * OTLP HTTP base URL (e.g. `http://localhost:4318`). When unset, the SDK
   * still starts with auto-instrumentation so in-process context works, but
   * spans are not exported.
   */
  otlpEndpoint?: string | undefined;
  serviceName: string;
  serviceVersion?: string;
}

let activeSdk: NodeSDK | null = null;

/**
 * Start the OpenTelemetry Node SDK with HTTP/Express/pg/ioredis/Nest
 * auto-instrumentation. Must run before the app creates HTTP servers or DB
 * clients so patches apply. Safe to call once; subsequent calls are no-ops.
 *
 * Returns an async shutdown function for graceful process exit.
 */
export function startTelemetry(options: TelemetryOptions): () => Promise<void> {
  if (options.disabled) {
    return async () => undefined;
  }

  if (activeSdk) {
    return shutdownTelemetry;
  }

  if (options.diagDebug) {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
  }

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: options.serviceName,
    ...(options.serviceVersion
      ? { [ATTR_SERVICE_VERSION]: options.serviceVersion }
      : {}),
  });

  const traceExporter = options.otlpEndpoint
    ? new OTLPTraceExporter({
        url: joinOtlpTracesUrl(options.otlpEndpoint),
      })
    : undefined;

  const sdk = new NodeSDK({
    resource,
    ...(traceExporter ? { traceExporter } : {}),
    instrumentations: [
      getNodeAutoInstrumentations({
        // fs spans drown useful signal; leave off unless debugging I/O.
        "@opentelemetry/instrumentation-fs": { enabled: false },
      }),
    ],
  });

  sdk.start();
  activeSdk = sdk;

  return shutdownTelemetry;
}

export async function shutdownTelemetry(): Promise<void> {
  const sdk = activeSdk;
  activeSdk = null;
  if (!sdk) {
    return;
  }
  await sdk.shutdown();
}

const TRAILING_SLASH = /\/$/u;

function joinOtlpTracesUrl(endpoint: string): string {
  const trimmed = endpoint.replace(TRAILING_SLASH, "");
  return trimmed.endsWith("/v1/traces") ? trimmed : `${trimmed}/v1/traces`;
}
