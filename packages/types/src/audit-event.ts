/** Mirrors internal-docs/api/auth-tenancy.md § Audit log — read-only, no create type. */
export interface AuditEvent {
  id: `aud_${string}`;
  workspaceId: string;
  actorId: string;
  ip: string | null;
  resource: string;
  resourceId: string | null;
  action: string;
  agentRunId: string | null;
  requestId: string | null;
  createdAt: string;
}
