import type { IncomingMessage } from "node:http";
import { parse as parseQuery } from "node:querystring";
import { Inject, Logger } from "@nestjs/common";
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
} from "@nestjs/websockets";
import { Database, findMemberByUser } from "@wire/db";
import type { WebSocket } from "ws";
import type { Auth } from "../auth/auth.config.js";
import { AUTH_INSTANCE } from "../auth/auth.module.js";
import { defineAbilityFor } from "../permissions/ability.factory.js";
import type { WorkspaceActor } from "../permissions/actor.js";
import { HEARTBEAT_MS, RealtimeService } from "./realtime.service.js";
import { WsSink } from "./ws-sink.js";

const POLICY_VIOLATION = 1008;
const DIGITS_PATTERN = /^\d+$/u;

function headersFrom(req: IncomingMessage): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") {
      headers.set(key, value);
    } else if (Array.isArray(value)) {
      headers.set(key, value.join(", "));
    }
  }
  return headers;
}

function toStringArray(
  value: string | string[] | undefined
): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  const values = Array.isArray(value) ? value : value.split(",");
  const filtered = values.filter((v) => v.length > 0);
  return filtered.length ? filtered : undefined;
}

/**
 * WebSocket alternative to the SSE stream (events.controller.ts's getStream).
 * Nest's HTTP guard chain (SessionGuard/PermissionsGuard) never runs on a WS
 * upgrade, so this gateway re-derives the same decision by hand on connect:
 * resolve the session the same way SessionGuard does, resolve membership the
 * same way PermissionsGuard does, check the same "read Event" ability — then
 * either close the socket (1008, before any data is sent) or attach it to
 * RealtimeService exactly like the SSE route does. All ACL/audience/replay
 * logic stays in RealtimeService; this file only does the connection lifecycle
 * and auth for this one transport. See internal-docs/api/events-webhooks.md.
 *
 * Connect with ?workspaceId=<id>&after_seq=<seq>&types=a,b&channel_ids=c,d
 */
@WebSocketGateway({ path: "/v1/ws" })
export class RealtimeWsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeWsGateway.name);
  private readonly closers = new WeakMap<WebSocket, () => void>();
  private readonly timers = new WeakMap<
    WebSocket,
    ReturnType<typeof setInterval>
  >();

  constructor(
    @Inject(AUTH_INSTANCE) private readonly auth: Auth,
    @Inject(Database) private readonly db: Database,
    private readonly realtime: RealtimeService
  ) {}

  async handleConnection(
    client: WebSocket,
    req: IncomingMessage
  ): Promise<void> {
    try {
      const actor = await this.authenticate(req);
      if (!actor) {
        client.close(POLICY_VIOLATION, "unauthorized");
        return;
      }

      const query = parseQuery(req.url?.split("?")[1] ?? "");
      const types = toStringArray(query.types);
      const channelIds = toStringArray(query.channel_ids);
      const afterSeqRaw = Array.isArray(query.after_seq)
        ? query.after_seq[0]
        : query.after_seq;
      const afterSeq =
        afterSeqRaw !== undefined && DIGITS_PATTERN.test(afterSeqRaw)
          ? Number(afterSeqRaw)
          : null;

      const sink = new WsSink(client);
      const { close } = await this.realtime.attachSink(actor, sink, {
        types: types ? new Set(types) : null,
        channelIds: channelIds ? new Set(channelIds) : null,
        afterSeq,
      });
      this.closers.set(client, close);

      const timer = setInterval(() => {
        sink.ping();
        this.realtime.heartbeat(actor);
      }, HEARTBEAT_MS);
      this.timers.set(client, timer);
    } catch (err) {
      this.logger.warn(`ws connection rejected: ${(err as Error).message}`);
      client.close(POLICY_VIOLATION, "rejected");
    }
  }

  handleDisconnect(client: WebSocket): void {
    const timer = this.timers.get(client);
    if (timer) {
      clearInterval(timer);
    }
    this.timers.delete(client);

    const close = this.closers.get(client);
    this.closers.delete(client);
    close?.();
  }

  /** Mirrors SessionGuard + PermissionsGuard's resolution for a single workspace-scoped request. */
  private async authenticate(
    req: IncomingMessage
  ): Promise<WorkspaceActor | null> {
    const query = parseQuery(req.url?.split("?")[1] ?? "");
    const workspaceId = Array.isArray(query.workspaceId)
      ? query.workspaceId[0]
      : query.workspaceId;
    if (!workspaceId) {
      return null;
    }

    const session = await this.auth.api.getSession({
      headers: headersFrom(req),
    });
    if (!session) {
      return null;
    }

    const member = await findMemberByUser(
      this.db,
      workspaceId,
      session.user.id
    );
    if (!member) {
      return null;
    }

    const role =
      member.role === "owner" || member.role === "admin" ? "admin" : "member";
    const ability = defineAbilityFor(role);
    if (!ability.can("read", "Event")) {
      return null;
    }

    return {
      userId: session.user.id,
      email: session.user.email,
      name: session.user.name,
      emailVerified: session.user.emailVerified,
      workspaceId,
      member: {
        id: member.id,
        role: member.role,
        displayName: member.displayName,
      },
      role,
    };
  }
}
