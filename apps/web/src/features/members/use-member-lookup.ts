import type { Member } from "@wire/types";
import { useMemo } from "react";
import { useMembers } from "./hooks.js";

export interface MemberLookup {
  displayNameFor: (actorId: string) => string;
  memberFor: (actorId: string) => Member | undefined;
}

/**
 * Message.actorId can be a member, an agent, or "system" — see Message.actorType.
 * This resolves against the already-fetched workspace member list (capped at
 * 100 per page today, matching internal-docs/product/04-implementation-roadmap.md's
 * current scope) rather than issuing one request per message.
 */
export function useMemberLookup(workspaceId: string): MemberLookup {
  const { data } = useMembers(workspaceId, { per_page: 100 });

  return useMemo(() => {
    const byId = new Map<string, Member>(
      (data?.items ?? []).map((m) => [m.id, m])
    );
    return {
      memberFor: (actorId: string) => byId.get(actorId),
      displayNameFor: (actorId: string) =>
        byId.get(actorId)?.displayName ?? actorId,
    };
  }, [data]);
}
