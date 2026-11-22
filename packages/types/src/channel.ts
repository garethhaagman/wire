/** Mirrors internal-docs/product/02-core-concepts.md § Channel */
export interface Channel {
  id: `ch_${string}`;
  workspaceId: string;
  name: string;
  type: "public" | "private" | "dm" | "group_dm";
  topic: string | null;
  purpose: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChannelRequest {
  name: string;
  type: Channel["type"];
  topic?: string;
  purpose?: string;
}
