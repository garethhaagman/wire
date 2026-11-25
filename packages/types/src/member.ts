/** Mirrors internal-docs/product/02-core-concepts.md § Member */
export interface Member {
  createdAt: string;
  displayName: string;
  email: string;
  id: `mem_${string}`;
  role: "owner" | "admin" | "member" | "guest";
  updatedAt: string;
  /** Better Auth user id once the invite has been claimed; null for a pending invite. */
  userId: string | null;
  workspaceId: string;
}

export interface CreateMemberRequest {
  displayName: string;
  email: string;
  role: Member["role"];
}

/** PATCH /v1/workspaces/{workspaceId}/members/{id} — `role` is admin-only. */
export interface UpdateMemberRequest {
  displayName?: string;
  role?: Member["role"];
}

/** product/05-feature-parity.md § Starred channels, notification preferences */
export interface MemberPreferences {
  mutedChannelIds: string[];
  starredChannelIds: string[];
}

export type UpdateMemberPreferencesRequest = Partial<MemberPreferences>;
