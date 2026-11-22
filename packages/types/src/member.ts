/** Mirrors internal-docs/product/02-core-concepts.md § Member */
export interface Member {
  id: `mem_${string}`;
  workspaceId: string;
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
