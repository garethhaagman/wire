import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Query,
  Req,
  Res,
  Body,
  Param,
} from "@nestjs/common";
import { ApiCookieAuth, ApiOkResponse, ApiProduces, ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { Database, listEventsAfter } from "@wire/db";
import type { PresenceEntry, WireEvent } from "@wire/types";
import {
  CursorPaginatedResult,
  CursorQueryDto,
  decodeCursor,
  encodeCursor,
} from "../common/dto/cursor-paginated-result.js";
import { ChannelAccessService } from "../channels/channel-access.service.js";
import { CurrentActor, type WorkspaceActor } from "../permissions/actor.js";
import { RequirePermission } from "../permissions/require-permission.decorator.js";
import { WorkspaceScope } from "../permissions/workspace-scope.decorator.js";
import { PresenceService } from "./presence.service.js";
import { HEARTBEAT_MS, RealtimeService } from "./realtime.service.js";
import { SseSink } from "./sse-sink.js";
import {
  PresenceEntryDto,
  StreamQueryDto,
  TypingRequestDto,
  WireEventDto,
} from "./dto/event.dto.js";

/**
 * Realtime surface — internal-docs/api/events-webhooks.md. Durable events come from
 * the transactional outbox (replayable); presence and typing are ephemeral.
 */
@ApiTags("Events")
@ApiCookieAuth()
@Controller("v1")
export class EventsController {
  constructor(
    @Inject(Database) private readonly db: Database,
    private readonly realtime: RealtimeService,
    private readonly presence: PresenceService,
    private readonly access: ChannelAccessService,
  ) {}

  /** Replay / poll durable events the caller can see, oldest first. */
  @Get("workspaces/:workspaceId/events")
  @RequirePermission("read", "Event")
  @ApiOkResponse({ type: WireEventDto, isArray: true })
  async list(
    @CurrentActor() actor: WorkspaceActor,
    @Query() query: CursorQueryDto,
  ): Promise<CursorPaginatedResult<WireEvent>> {
    const perPage = query.per_page ?? 50;
    const afterSeq = decodeCursor(query.cursor)?.seq ?? query.after_seq ?? 0;
    const page = await listEventsAfter(this.db, {
      workspaceId: actor.workspaceId,
      afterSeq,
      limit: perPage,
      viewerMemberId: actor.member.id,
      viewerIsGuest: actor.member.role === "guest",
    });
    const last = page.items.at(-1);
    return new CursorPaginatedResult(page.items, {
      per_page: perPage,
      has_more: page.hasMore,
      next_cursor: last ? encodeCursor("after", last.seq) : (query.cursor ?? null),
    });
  }

  /**
   * Server-sent events. Reconnect with `Last-Event-ID` (browsers do this
   * automatically) to resume without gaps; a `resync` event means the client fell
   * too far behind and should refetch state over REST.
   */
  @Get("workspaces/:workspaceId/events/stream")
  @RequirePermission("read", "Event")
  @ApiProduces("text/event-stream")
  @ApiOkResponse({
    description: "text/event-stream of WireEvent frames (event: <type>, id: <seq>)",
  })
  async getStream(
    @CurrentActor() actor: WorkspaceActor,
    @Query() query: StreamQueryDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const lastEventId = Number(req.header("Last-Event-ID"));
    const afterSeq =
      Number.isInteger(lastEventId) && lastEventId >= 0 ? lastEventId : (query.after_seq ?? null);

    res.status(200);
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    res.write(`retry: 3000\n\n`);

    const sink = new SseSink(actor.member.id, res);
    const { close } = await this.realtime.attachSink(actor, sink, {
      types: query.types?.length ? new Set(query.types) : null,
      channelIds: query.channel_ids?.length ? new Set(query.channel_ids) : null,
      afterSeq,
    });

    const heartbeat = setInterval(() => {
      sink.ping();
      this.realtime.heartbeat(actor);
    }, HEARTBEAT_MS);

    req.on("close", () => {
      clearInterval(heartbeat);
      close();
    });
  }

  /** Heartbeat for clients not holding a stream open (an open stream heartbeats itself). */
  @Post("workspaces/:workspaceId/presence")
  @RequirePermission("create", "Presence")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ schema: { type: "null" } })
  async create(@CurrentActor() actor: WorkspaceActor): Promise<null> {
    await this.presence.heartbeat(actor.workspaceId, actor.member.id);
    return null;
  }

  @Get("workspaces/:workspaceId/presence")
  @RequirePermission("read", "Presence")
  @ApiOkResponse({ type: PresenceEntryDto, isArray: true })
  listPresence(@CurrentActor() actor: WorkspaceActor): Promise<PresenceEntry[]> {
    return this.presence.listActive(actor.workspaceId);
  }

  @Post("channels/:channelId/typing")
  @WorkspaceScope({ from: "channel", param: "channelId" })
  @RequirePermission("create", "Presence")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ schema: { type: "null" } })
  async createTyping(
    @CurrentActor() actor: WorkspaceActor,
    @Param("channelId") channelId: string,
    @Body() body: TypingRequestDto,
  ): Promise<null> {
    await this.access.writable(actor, channelId);
    await this.presence.typing(
      actor.workspaceId,
      channelId,
      actor.member.id,
      body.threadRootId ?? null,
    );
    return null;
  }
}
