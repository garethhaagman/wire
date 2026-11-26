import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { queryKeys } from "@/lib/query-keys.js";
import { listPresence } from "./api.js";
import { useRealtime } from "./realtime-provider.js";

const TYPING_EXPIRY_MS = 5000;

/**
 * Polls the presence snapshot rather than deriving it from SSE frames —
 * `presence.online` frames are per-heartbeat deltas, not a full roster, so a
 * periodic GET against the authoritative list is simpler than reconstructing
 * state from a partial event stream. 15s matches the server's heartbeat
 * cadence (HEARTBEAT_MS) closely enough for a "who's around" indicator.
 */
export function usePresence(workspaceId: string) {
  return useQuery({
    queryKey: queryKeys.presence.all(workspaceId),
    queryFn: () => listPresence(workspaceId),
    enabled: Boolean(workspaceId),
    refetchInterval: 15_000,
  });
}

/** Member ids currently typing in `channelId` (and `threadRootId`, if given), expiring 5s after their last signal. */
export function useTypingMembers(
  channelId: string | null,
  threadRootId?: string
): string[] {
  const { subscribeEphemeral } = useRealtime();
  const [typingIds, setTypingIds] = useState<string[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(
    () =>
      subscribeEphemeral("typing", (data) => {
        if (data.channelId !== channelId) {
          return;
        }
        if ((data.threadRootId ?? undefined) !== threadRootId) {
          return;
        }
        const memberId = data.memberId as string;
        setTypingIds((current) =>
          current.includes(memberId) ? current : [...current, memberId]
        );
        clearTimeout(timers.current.get(memberId));
        timers.current.set(
          memberId,
          setTimeout(() => {
            setTypingIds((current) => current.filter((id) => id !== memberId));
          }, TYPING_EXPIRY_MS)
        );
      }),
    [subscribeEphemeral, channelId, threadRootId]
  );

  useEffect(
    () => () => {
      for (const timer of timers.current.values()) {
        clearTimeout(timer);
      }
    },
    []
  );

  return typingIds;
}
