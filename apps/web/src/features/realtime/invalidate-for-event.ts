import type { QueryClient } from "@tanstack/react-query";
import type {
  Agent,
  AgentRun,
  Member,
  Message,
  Pin,
  Reaction,
  WireEvent,
  WireFile,
} from "@wire/types";
import { queryKeys } from "@/lib/query-keys.js";

/**
 * Maps each WireEvent type to the query keys it invalidates. Invalidate-on-event
 * (rather than hand-patching cache entries) keeps this mapping small and immune
 * to cache-shape drift as features evolve — the next render just refetches,
 * which is cheap at Wire's current data volumes. See internal-docs/api/events-webhooks.md.
 *
 * Each case's `data` shape is read from the actual publish call site, not
 * inferred — entity-mutation events wrap the full row under a singular key
 * (`{ message }`, `{ reaction }`, `{ pin }`, `{ member }`, `{ agent }`,
 * `{ run }`, `{ file }`); deletion/removal and membership events are flat ID
 * fields instead, and inconsistently so (e.g. `message.deleted` has no
 * nested object but carries `threadRootId`; `member.removed` is only
 * `{ memberId }`, with no channelId). `event.channelId` (top-level, nullable)
 * is a reliable fallback for channel-scoped events but is null for
 * workspace-scoped ones (member/agent/file), so each case reads from
 * wherever its own data actually puts the id.
 */
export function invalidateForEvent(
  queryClient: QueryClient,
  workspaceId: string,
  event: WireEvent
): void {
  switch (event.type) {
    case "message.created":
    case "thread.reply": {
      const { message } = event.data as { message: Message };
      void queryClient.invalidateQueries({
        queryKey: queryKeys.messages.all(message.channelId),
      });
      if (message.threadRootId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.threads.all(message.threadRootId),
        });
      }
      void queryClient.invalidateQueries({
        queryKey: queryKeys.channels.all(workspaceId),
      });
      return;
    }
    case "message.edited": {
      const { message } = event.data as { message: Message };
      void queryClient.invalidateQueries({
        queryKey: queryKeys.messages.all(message.channelId),
      });
      if (message.threadRootId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.threads.all(message.threadRootId),
        });
      }
      return;
    }
    case "message.deleted": {
      const { channelId, threadRootId } = event.data as {
        channelId?: string;
        threadRootId: string | null;
      };
      const resolvedChannelId = channelId ?? event.channelId;
      if (resolvedChannelId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.messages.all(resolvedChannelId),
        });
      }
      if (threadRootId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.threads.all(threadRootId),
        });
      }
      return;
    }
    case "reaction.added": {
      const { reaction } = event.data as { reaction: Reaction };
      void queryClient.invalidateQueries({
        queryKey: queryKeys.reactions.all(reaction.messageId),
      });
      if (event.channelId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.messages.all(event.channelId),
        });
      }
      return;
    }
    case "reaction.removed": {
      const { messageId } = event.data as { messageId: string };
      void queryClient.invalidateQueries({
        queryKey: queryKeys.reactions.all(messageId),
      });
      if (event.channelId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.messages.all(event.channelId),
        });
      }
      return;
    }
    case "pin.added":
    case "pin.removed": {
      const { pin } = event.data as { pin: Pin };
      void queryClient.invalidateQueries({
        queryKey: queryKeys.pins.all(pin.channelId),
      });
      return;
    }
    case "channel.created":
    case "channel.updated":
    case "channel.archived":
    case "channel.unarchived": {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.channels.all(workspaceId),
      });
      return;
    }
    case "channel.member.joined":
    case "channel.member.left": {
      const { channelId } = event.data as { channelId: string };
      void queryClient.invalidateQueries({
        queryKey: queryKeys.channels.all(workspaceId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.channels.members(channelId),
      });
      return;
    }
    case "member.joined":
    case "member.updated": {
      const { member } = event.data as { member: Member };
      void queryClient.invalidateQueries({
        queryKey: queryKeys.members.all(member.workspaceId),
      });
      return;
    }
    case "member.removed": {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.members.all(workspaceId),
      });
      return;
    }
    case "agent.created":
    case "agent.updated": {
      const { agent } = event.data as { agent: Agent };
      void queryClient.invalidateQueries({
        queryKey: queryKeys.agents.all(agent.workspaceId),
      });
      return;
    }
    case "agent.run.created":
    case "agent.run.completed": {
      const { run } = event.data as { run: AgentRun };
      void queryClient.invalidateQueries({
        queryKey: queryKeys.agents.runs(run.workspaceId, run.agentId),
      });
      return;
    }
    case "file.created": {
      const { file } = event.data as { file: WireFile };
      void queryClient.invalidateQueries({
        queryKey: queryKeys.files.all(file.channelId),
      });
      return;
    }
    default:
      return;
  }
}
