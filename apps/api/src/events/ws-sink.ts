import type { WireEvent } from "@wire/types";
import type { WebSocket } from "ws";
import type { StreamSink } from "./realtime.service.js";

/**
 * Adapts a `ws` WebSocket to the transport-agnostic StreamSink. Frame shape is a
 * single JSON object per message: `{ event: <type>, data: <payload> }` — `data`
 * is the full WireEvent for durable events, or `{ channelId, ...fields }` for
 * ephemeral ones, mirroring the SSE `event:`/`data:` split without SSE's text
 * framing.
 */
export class WsSink implements StreamSink {
  constructor(private readonly socket: WebSocket) {}

  get ended(): boolean {
    return this.socket.readyState !== this.socket.OPEN;
  }

  sendEvent(event: WireEvent): void {
    this.write({ event: event.type, data: event });
  }

  sendEphemeral(
    type: string,
    channelId: string | null,
    data: Record<string, unknown>
  ): void {
    this.write({ event: type, data: { channelId, ...data } });
  }

  sendResync(): void {
    this.write({ event: "resync", data: { reason: "too_far_behind" } });
  }

  ping(): void {
    if (this.socket.readyState === this.socket.OPEN) {
      this.socket.ping();
    }
  }

  end(): void {
    if (
      this.socket.readyState === this.socket.OPEN ||
      this.socket.readyState === this.socket.CONNECTING
    ) {
      this.socket.close(1000, "closed");
    }
  }

  private write(frame: { event: string; data: unknown }): void {
    if (this.ended) {
      return;
    }
    // `ws` buffers internally and exposes backpressure via `bufferedAmount`; unlike
    // the SSE Response there's no risk of unbounded Node-side buffering from a
    // single `send()`, so no slow-consumer eviction is needed here — a socket that
    // can't keep up backpressures at the TCP layer instead.
    this.socket.send(JSON.stringify(frame));
  }
}
