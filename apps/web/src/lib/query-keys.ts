import type { OffsetPageParams } from "./pagination.js";

/**
 * One key factory per resource, namespaced under the resource name so
 * `queryClient.invalidateQueries({ queryKey: queryKeys.messages.all(channelId) })`
 * reads the same way the REST path nests (channel -> messages). Collection
 * prefixes stay separate from list keys so invalidation can target every
 * filtered page while every request input remains part of its cache identity.
 */
export const queryKeys = {
  workspaces: {
    all: () => ["workspaces"] as const,
    list: (params: OffsetPageParams = {}) =>
      ["workspaces", "list", params] as const,
    detail: (id: string) => ["workspaces", id] as const,
  },
  channels: {
    all: (workspaceId: string) =>
      ["workspaces", workspaceId, "channels"] as const,
    list: (workspaceId: string, params: OffsetPageParams = {}) =>
      ["workspaces", workspaceId, "channels", "list", params] as const,
    detail: (workspaceId: string, channelId: string) =>
      ["workspaces", workspaceId, "channels", channelId] as const,
    members: (channelId: string) => ["channels", channelId, "members"] as const,
    memberList: (channelId: string, params: OffsetPageParams = {}) =>
      ["channels", channelId, "members", "list", params] as const,
  },
  messages: {
    all: (channelId: string) => ["channels", channelId, "messages"] as const,
    detail: (channelId: string, messageId: string) =>
      ["channels", channelId, "messages", messageId] as const,
  },
  threads: {
    all: (threadRootId: string) =>
      ["threads", threadRootId, "messages"] as const,
  },
  members: {
    all: (workspaceId: string) =>
      ["workspaces", workspaceId, "members"] as const,
    list: (workspaceId: string, params: OffsetPageParams = {}) =>
      ["workspaces", workspaceId, "members", "list", params] as const,
    detail: (workspaceId: string, memberId: string) =>
      ["workspaces", workspaceId, "members", memberId] as const,
    me: (workspaceId: string) =>
      ["workspaces", workspaceId, "members", "me"] as const,
    preferences: (workspaceId: string) =>
      ["workspaces", workspaceId, "members", "me", "preferences"] as const,
  },
  reactions: {
    all: (messageId: string) => ["messages", messageId, "reactions"] as const,
  },
  pins: {
    all: (channelId: string) => ["channels", channelId, "pins"] as const,
  },
  bookmarks: {
    all: (workspaceId: string) =>
      ["workspaces", workspaceId, "bookmarks"] as const,
    list: (workspaceId: string, params: OffsetPageParams = {}) =>
      ["workspaces", workspaceId, "bookmarks", "list", params] as const,
  },
  files: {
    all: (channelId: string) => ["channels", channelId, "files"] as const,
    list: (channelId: string, params: OffsetPageParams = {}) =>
      ["channels", channelId, "files", "list", params] as const,
    detail: (fileId: string) => ["files", fileId] as const,
  },
  search: {
    results: (params: {
      channelId?: string;
      page?: number;
      perPage?: number;
      query: string;
      threadRootId?: string;
      workspaceId?: string;
    }) => ["workspaces", params.workspaceId ?? "", "search", params] as const,
  },
  agents: {
    all: (workspaceId: string) =>
      ["workspaces", workspaceId, "agents"] as const,
    list: (workspaceId: string, params: OffsetPageParams = {}) =>
      ["workspaces", workspaceId, "agents", "list", params] as const,
    detail: (workspaceId: string, agentId: string) =>
      ["workspaces", workspaceId, "agents", agentId] as const,
    runs: (workspaceId: string, agentId: string) =>
      ["workspaces", workspaceId, "agents", agentId, "runs"] as const,
    runList: (
      workspaceId: string,
      agentId: string,
      params: OffsetPageParams = {}
    ) =>
      [
        "workspaces",
        workspaceId,
        "agents",
        agentId,
        "runs",
        "list",
        params,
      ] as const,
    run: (workspaceId: string, agentId: string, runId: string) =>
      ["workspaces", workspaceId, "agents", agentId, "runs", runId] as const,
  },
  webhooks: {
    all: (workspaceId: string) =>
      ["workspaces", workspaceId, "webhook-endpoints"] as const,
    list: (workspaceId: string, params: OffsetPageParams = {}) =>
      ["workspaces", workspaceId, "webhook-endpoints", "list", params] as const,
    detail: (workspaceId: string, id: string) =>
      ["workspaces", workspaceId, "webhook-endpoints", id] as const,
  },
  audit: {
    all: (workspaceId: string) =>
      ["workspaces", workspaceId, "audit-events"] as const,
    list: (workspaceId: string, params: OffsetPageParams = {}) =>
      ["workspaces", workspaceId, "audit-events", "list", params] as const,
  },
  uiConfig: {
    detail: (workspaceId: string) => ["ui-config", workspaceId] as const,
  },
  events: {
    all: (workspaceId: string) =>
      ["workspaces", workspaceId, "events"] as const,
  },
  presence: {
    all: (workspaceId: string) =>
      ["workspaces", workspaceId, "presence"] as const,
  },
} as const;
