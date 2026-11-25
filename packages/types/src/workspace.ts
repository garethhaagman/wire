/**
 * Mirrors internal-docs/data-model/data-model.md `workspaces` table.
 * TODO: generate from api/openapi.yaml once the OpenAPI spec has a Workspace schema with
 * an x-wire-codegen marker (see internal-docs/stack/monorepo-layout.md).
 */
export interface Workspace {
  createdAt: string;
  dataRegion: string;
  id: `ws_${string}`;
  name: string;
  orgId: string;
  updatedAt: string;
}

export interface CreateWorkspaceRequest {
  dataRegion: string;
  name: string;
}

export interface UpdateWorkspaceRequest {
  name?: string;
}
