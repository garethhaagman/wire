/** Mirrors internal-docs/product/02-core-concepts.md § Channel */
export interface Channel {
  id: `ch_${string}`;
  workspaceId: string;
  name: string;
  type: "public" | "private" | "dm" | "group_dm";
  topic: string | null;
  purpose: string | null;
  createdBy: string | null;
  memberCount: number;
  /** Highest message sequence number in the channel — compare with `lastReadSeq` for unread state. */
  lastMessageSeq: number;
  lastMessageAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Whether the requesting member belongs to the channel. */
  isMember: boolean;
  /** The requesting member's read cursor; null when not a member. */
  lastReadSeq: number | null;
  /** Unread top-level messages for the requesting member (capped at 100); null when not a member. */
  unreadCount: number | null;
}

export interface CreateChannelRequest {
  /** Required for public/private; ignored for dm/group_dm. */
  name?: string;
  type: Channel["type"];
  topic?: string;
  purpose?: string;
  /** Initial members besides the creator. Required for `dm` (exactly one) and `group_dm`. */
  memberIds?: string[];
}

export interface UpdateChannelRequest {
  name?: string;
  topic?: string | null;
  purpose?: string | null;
}

export interface ChannelMember {
  channelId: string;
  memberId: string;
  lastReadSeq: number;
  joinedAt: string;
}

export interface AddChannelMemberRequest {
  memberId: string;
}

/** POST .../mark-read — omit `seq` to mark everything currently in the channel/thread as read. */
export interface MarkReadRequest {
  seq?: number;
}
