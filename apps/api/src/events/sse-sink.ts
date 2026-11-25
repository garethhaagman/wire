import { Logger } from "@nestjs/common";
import type { WireEvent } from "@wire/types";
import type { Response } from "express";
import type { StreamSink } from "./realtime.service.js";

/** Slow consumers are disconnected (they resume via Last-Event-ID) instead of buffering unbounded memory. */
// biome-ignore lint/suspicious/noBitwiseOperators: 1 << 20 is a readable spelling of 1 MiB
const MAX_BUFFERED_BYTES = 1 << 20;

/** Adapts an Express `Response` held open as `text/event-stream` to the transport-agnostic StreamSink RealtimeService writes through. */
export class SseSink implements StreamSink {
  private readonly logger = new Logger(SseSink.name);

  constructor(
    private readonly id: string,
    private readonly res: Response
  ) {}

  get ended(): boolean {
    return this.res.writableEnded;
  }

  sendEvent(event: WireEvent): void {
    this.write(
      `id: ${event.seq}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
    );
  }

  sendEphemeral(
    type: string,
    channelId: string | null,
    data: Record<string, unknown>
  ): void {
    this.write(
      `event: ${type}\ndata: ${JSON.stringify({ channelId, ...data })}\n\n`
    );
  }

  sendResync(): void {
    this.write(`event: resync\ndata: {"reason":"too_far_behind"}\n\n`);
  }

  ping(): void {
    this.write(": ping\n\n");
  }

  end(): void {
    this.res.end();
  }

  private write(frame: string): void {
    if (this.res.writableEnded) {
      return;
    }
    if (this.res.writableLength > MAX_BUFFERED_BYTES) {
      this.logger.warn(`disconnecting slow consumer ${this.id}`);
      this.res.end();
      return;
    }
    this.res.write(frame);
  }
}
