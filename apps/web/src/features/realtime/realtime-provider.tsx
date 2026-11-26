import { useQueryClient } from "@tanstack/react-query";
import type { WireEvent, WireEventType } from "@wire/types";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { invalidateForEvent } from "./invalidate-for-event.js";

const API_URL = import.meta.env.VITE_API_URL;

type EphemeralEventName = "presence.online" | "typing";

interface RealtimeContextValue {
  subscribeEphemeral: (
    type: EphemeralEventName,
    handler: (data: Record<string, unknown>) => void
  ) => () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

const DURABLE_TYPES: WireEventType[] = [
  "message.created",
  "message.edited",
  "message.deleted",
  "thread.reply",
  "reaction.added",
  "reaction.removed",
  "pin.added",
  "pin.removed",
  "channel.created",
  "channel.updated",
  "channel.archived",
  "channel.unarchived",
  "channel.member.joined",
  "channel.member.left",
  "member.joined",
  "member.updated",
  "member.removed",
  "agent.created",
  "agent.updated",
  "agent.run.created",
  "agent.run.completed",
  "file.created",
];

const EPHEMERAL_TYPES: EphemeralEventName[] = ["presence.online", "typing"];

function parseEventData<T>(data: string): T | null {
  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

/**
 * One SSE connection per workspace, shared by every consumer via context —
 * durable WireEvents drive query invalidation (see invalidate-for-event.ts),
 * ephemeral frames (presence, typing) fan out to subscribeEphemeral()
 * listeners instead, since they're never meant to touch the query cache
 * (internal-docs/api/events-webhooks.md "ephemeral, never persisted").
 */
export function RealtimeProvider({
  workspaceId,
  children,
}: {
  children: ReactNode;
  workspaceId: string;
}): React.JSX.Element {
  const queryClient = useQueryClient();
  const ephemeralHandlers = useRef(
    new Map<EphemeralEventName, Set<(data: Record<string, unknown>) => void>>()
  );

  useEffect(() => {
    const source = new EventSource(
      `${API_URL}/v1/workspaces/${workspaceId}/events/stream`,
      { withCredentials: true }
    );

    const durableListeners = DURABLE_TYPES.map((type) => {
      const listener = (e: MessageEvent<string>): void => {
        const event = parseEventData<WireEvent>(e.data);
        if (event) {
          invalidateForEvent(queryClient, workspaceId, event);
        }
      };
      source.addEventListener(type, listener);
      return { type, listener };
    });

    const ephemeralListeners = EPHEMERAL_TYPES.map((type) => {
      const listener = (e: MessageEvent<string>): void => {
        const data = parseEventData<Record<string, unknown>>(e.data);
        if (!data) {
          return;
        }
        for (const handler of ephemeralHandlers.current.get(type) ?? []) {
          handler(data);
        }
      };
      source.addEventListener(type, listener);
      return { type, listener };
    });

    return () => {
      for (const { type, listener } of durableListeners) {
        source.removeEventListener(type, listener);
      }
      for (const { type, listener } of ephemeralListeners) {
        source.removeEventListener(type, listener);
      }
      source.close();
    };
  }, [workspaceId, queryClient]);

  const value = useMemo<RealtimeContextValue>(
    () => ({
      subscribeEphemeral: (type, handler) => {
        const handlers =
          ephemeralHandlers.current.get(type) ??
          new Set<(data: Record<string, unknown>) => void>();
        handlers.add(handler);
        ephemeralHandlers.current.set(type, handlers);
        return () => handlers.delete(handler);
      },
    }),
    []
  );

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext);
  if (!ctx) {
    throw new Error("useRealtime must be used within RealtimeProvider");
  }
  return ctx;
}
