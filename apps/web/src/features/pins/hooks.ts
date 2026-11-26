import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys.js";
import { addPin, listPins, removePin } from "./api.js";

export function usePins(channelId: string | null) {
  return useQuery({
    queryKey: queryKeys.pins.all(channelId ?? ""),
    queryFn: () => listPins(channelId as string),
    enabled: Boolean(channelId),
  });
}

export function useAddPin(channelId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => addPin(channelId, messageId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.pins.all(channelId),
      });
    },
  });
}

export function useRemovePin(channelId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pinId: string) => removePin(channelId, pinId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.pins.all(channelId),
      });
    },
  });
}
