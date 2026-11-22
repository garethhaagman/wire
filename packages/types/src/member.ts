/** Mirrors internal-docs/product/02-core-concepts.md § Member */
export interface Member {
  id: `mem_${string}`;
  workspaceId: string;
  /** Better Auth user id once the invite has been claimed; null for a pending invite. */
  userId: string | null;
  displayName: string;
  email: string;
  role: "owner" | "admin" | "member" | "guest";
  createdAt: string;
  updatedAt: string;
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
  starredChannelIds: string[];
  mutedChannelIds: string[];
}

export type UpdateMemberPreferencesRequest = Partial<MemberPreferences>;
