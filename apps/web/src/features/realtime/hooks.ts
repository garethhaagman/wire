import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useMe } from "@/features/members/hooks.js";
import { queryKeys } from "@/lib/query-keys.js";
import { listPresence } from "./api.js";
import { useRealtime } from "./realtime-provider.js";

const TYPING_EXPIRY_MS = 5000;

/**
 * Polls the presence snapshot rather than deriving it from SSE frames -
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

/**
 * Member ids currently typing in `channelId` (and `threadRootId`, if given),
 * expiring 5s after their last signal. The caller's own member id is excluded -
 * the server fans typing out to every connection, including the sender.
 */
export function useTypingMembers(
  channelId: string | null,
  workspaceId: string,
  threadRootId?: string
): string[] {
  const { subscribeEphemeral } = useRealtime();
  const { data: me } = useMe(workspaceId);
  const myMemberId = me?.id;
  const [typingIds, setTypingIds] = useState<string[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    setTypingIds([]);
    for (const timer of timers.current.values()) {
      clearTimeout(timer);
    }
    timers.current.clear();

    const unsubscribe = subscribeEphemeral("typing", (data) => {
      if (data.channelId !== channelId) {
        return;
      }
      if ((data.threadRootId ?? undefined) !== threadRootId) {
        return;
      }
      const memberId = data.memberId as string;
      if (!memberId || memberId === myMemberId) {
        return;
      }
      setTypingIds((current) =>
        current.includes(memberId) ? current : [...current, memberId]
      );
      clearTimeout(timers.current.get(memberId));
      timers.current.set(
        memberId,
        setTimeout(() => {
          setTypingIds((current) => current.filter((id) => id !== memberId));
          timers.current.delete(memberId);
        }, TYPING_EXPIRY_MS)
      );
    });

    return () => {
      unsubscribe();
      for (const timer of timers.current.values()) {
        clearTimeout(timer);
      }
      timers.current.clear();
    };
  }, [subscribeEphemeral, channelId, threadRootId, myMemberId]);

  return typingIds;
}
