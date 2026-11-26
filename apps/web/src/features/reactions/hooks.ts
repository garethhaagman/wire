import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys.js";
import { addReaction, listReactions, removeReaction } from "./api.js";

export function useReactions(messageId: string) {
  return useQuery({
    queryKey: queryKeys.reactions.all(messageId),
    queryFn: () => listReactions(messageId),
  });
}

/**
 * `channelId` is only needed so the message list (which carries
 * denormalized `reactionCounts`) gets re-fetched alongside the reaction list.
 */
export function useToggleReaction(channelId: string, messageId: string) {
  const queryClient = useQueryClient();

  const invalidate = (): void => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.reactions.all(messageId),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.messages.all(channelId),
    });
  };

  const add = useMutation({
    mutationFn: (emoji: string) => addReaction(messageId, emoji),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (emoji: string) => removeReaction(messageId, emoji),
    onSuccess: invalidate,
  });

  return { add, remove };
}
