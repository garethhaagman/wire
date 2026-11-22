/**
 * Mirrors internal-docs/data-model/data-model.md `workspaces` table.
 * TODO: generate from api/openapi.yaml once the OpenAPI spec has a Workspace schema with
 * an x-wire-codegen marker (see internal-docs/stack/monorepo-layout.md).
 */
export interface Workspace {
  id: `ws_${string}`;
  orgId: string;
  name: string;
  dataRegion: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkspaceRequest {
  name: string;
  dataRegion: string;
}
