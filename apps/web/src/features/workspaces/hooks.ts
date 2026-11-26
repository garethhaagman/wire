import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
} from "@wire/types";
import type { OffsetPageParams } from "@/lib/pagination.js";
import { queryKeys } from "@/lib/query-keys.js";
import {
  createWorkspace,
  getWorkspace,
  listWorkspaces,
  updateWorkspace,
} from "./api.js";

export function useWorkspaces(params: OffsetPageParams = {}) {
  return useQuery({
    queryKey: queryKeys.workspaces.list(params),
    queryFn: () => listWorkspaces(params),
  });
}

export function useWorkspace(id: string) {
  return useQuery({
    queryKey: queryKeys.workspaces.detail(id),
    queryFn: () => getWorkspace(id),
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateWorkspaceRequest) => createWorkspace(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workspaces.all(),
      });
    },
  });
}

export function useUpdateWorkspace(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateWorkspaceRequest) => updateWorkspace(id, body),
    onSuccess: (workspace) => {
      queryClient.setQueryData(queryKeys.workspaces.detail(id), workspace);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workspaces.all(),
      });
    },
  });
}
