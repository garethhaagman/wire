/** Mirrors internal-docs/product/02-core-concepts.md § Channel */
export interface Channel {
  archivedAt: string | null;
  createdAt: string;
  createdBy: string | null;
  id: `ch_${string}`;
  /** Whether the requesting member belongs to the channel. */
  isMember: boolean;
  lastMessageAt: string | null;
  /** Highest message sequence number in the channel — compare with `lastReadSeq` for unread state. */
  lastMessageSeq: number;
  /** The requesting member's read cursor; null when not a member. */
  lastReadSeq: number | null;
  memberCount: number;
  name: string;
  purpose: string | null;
  topic: string | null;
  type: "public" | "private" | "dm" | "group_dm";
  /** Unread top-level messages for the requesting member (capped at 100); null when not a member. */
  unreadCount: number | null;
  updatedAt: string;
  workspaceId: string;
}

export interface CreateChannelRequest {
  /** Initial members besides the creator. Required for `dm` (exactly one) and `group_dm`. */
  memberIds?: string[];
  /** Required for public/private; ignored for dm/group_dm. */
  name?: string;
  purpose?: string;
  topic?: string;
  type: Channel["type"];
}

export interface UpdateChannelRequest {
  name?: string;
  purpose?: string | null;
  topic?: string | null;
}

export interface ChannelMember {
  channelId: string;
  joinedAt: string;
  lastReadSeq: number;
  memberId: string;
}

export interface AddChannelMemberRequest {
  memberId: string;
}

/** POST .../mark-read — omit `seq` to mark everything currently in the channel/thread as read. */
export interface MarkReadRequest {
  seq?: number;
}
