import { Reflector } from "@nestjs/core";

/**
 * Where PermissionsGuard finds the workspace a request belongs to. Routes with a
 * `:workspaceId` param need no decorator; everything nested under a channel,
 * message, or file declares how to get from that id back to its workspace.
 */
export type WorkspaceScopeSource =
  | { from: "workspace"; param: string }
  | { from: "channel"; param: string }
  | { from: "message"; param: string }
  | { from: "file"; param: string }
  | { from: "bodyChannel"; field: string }
  | { from: "optionalQueryWorkspace"; key: string };

/** Applied at class or handler level; the handler wins. */
export const WorkspaceScope = Reflector.createDecorator<WorkspaceScopeSource>();
