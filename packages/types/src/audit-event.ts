/** Mirrors internal-docs/api/auth-tenancy.md § Audit log — read-only, no create type. */
export interface AuditEvent {
  action: string;
  actorId: string;
  agentRunId: string | null;
  createdAt: string;
  id: `aud_${string}`;
  ip: string | null;
  requestId: string | null;
  resource: string;
  resourceId: string | null;
  workspaceId: string;
}
