# Threat model

## Why this is its own doc

`api/auth-tenancy.md` specifies the auth/RBAC _mechanism_; this doc is the _adversarial_ read of it: what can go wrong and who's defending against what. A spec this agent-heavy has threat surface that a normal chat app doesn't: agents are actors with tool access and budgets, automations can be authored by agents, and MCP exposes the whole surface to third-party hosts.

## Actors and trust boundaries

```text
Human member ──┐
Service account├──▶ Workspace ──▶ Postgres / object store / queue (self-hosted, operator-trusted)
Agent (via harness) ┘      ▲
                            │
MCP host (Claude Desktop,  │
Cursor, custom) ───────────┘  <- untrusted-by-default, scoped via delegation token
```

The most important trust boundary the existing spec already gets right: **agents never bypass the HTTP API internally** (per `stack/architecture.md`). This means every threat that applies to a human caller also applies uniformly to an agent caller, which is good for threat modeling (one surface to defend) but means a compromised or misconfigured agent has the _same_ blast radius as a compromised API key, scaled by however many channels it's installed in.

## Threats specific to the agent/automation model

| Threat                                                                                                                                     | Existing mitigation in spec                                                               | Gap                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Prompt injection → unintended tool call** (malicious content in a channel instructs an agent reading it via retrieval to take an action) | `policies.require_approval` HITL gate (`product/03-agents.md`); tool allowlists per agent | No documented mitigation for _read_-only actions still being dangerous (e.g. injected content causing an agent to exfiltrate data via a legitimate search/post call it's allowed to make). Needs a documented stance: should agents ever auto-act on instructions found _inside_ retrieved content vs. only the inciting user turn?                                                                                                                                                             |
| **Automation privilege escalation**                                                                                                        | `agent_automation_publish_requires_approval` default true (`automations/automations.md`)  | Good default. Verify it can't be disabled by an agent with `automations:write` itself: approval-bypass-by-the-approved-party is a classic self-referential hole.                                                                                                                                                                                                                                                                                                                                |
| **Delegation depth abuse** (child runs spawning child runs to multiply budget/blast radius)                                                | Depth limit default 3 (`product/03-agents.md`)                                            | Depth limit caps fan-out _depth_ but not _width_: nothing caps total descendant runs per root run. Add a max-descendants-per-root cap alongside depth.                                                                                                                                                                                                                                                                                                                                          |
| **MCP host over-scoping**                                                                                                                  | Delegation tokens, tool-scoped (`mcp/mcp.md`)                                             | Token exchange flow (`POST /v1/oauth/mcp-token` with PKCE) needs explicit scope-confirmation UX documented: a user approving "Wire MCP wants access" should see the actual scopes, not a blanket grant, or this becomes OAuth-consent-fatigue territory.                                                                                                                                                                                                                                        |
| **Webhook/automation SSRF** (`http.request` action hitting internal infra)                                                                 | None documented                                                                           | `http.request` action (`automations/automations.md`) needs an explicit egress policy: block RFC1918/loopback targets unless admin-allowlisted, since a workspace member with `automations:write` can otherwise use Wire's own worker as an SSRF pivot into the self-hosted deployment's internal network. **This is the highest-priority gap to close before launch** given the self-hosted topology in `stack/architecture.md` puts `worker` on the same network as `postgres`/`object-store`. |

## Threats from self-hosting specifically

Per `stack/self-hosting.md`, Wire doesn't control the deployment environment. The threat model must assume:

- **Operator-introduced misconfiguration** is the most likely real-world incident class (exposed Postgres port, missing TLS, default credentials): mitigate with a hardened default Pulumi config (`stack/infra-pulumi.md`) that fails closed (no default passwords, TLS required) rather than a permissive default that "works out of the box" insecurely.
- **No vendor-side incident response**: self-hosted customers are on their own for detection; the audit log (`api/auth-tenancy.md`) is the primary forensic surface, so its completeness and immutability matter more here than in a hosted product.

## Data classification

| Class                 | Examples                                                    | Handling                                                                                                      |
| --------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Secrets**           | API keys, agent `secrets_ref`, harness provider credentials | Never returned in API (`product/03-agents.md`); vault pointers only                                           |
| **Confidential bulk** | Slack export zips                                           | Encrypt at rest, TTL delete per `import/workspace-import.md`                                                  |
| **Sensitive content** | DM/private channel bodies, PII in messages                  | DLP redaction before embed/export (`retrieval/retrieval.md`); never leak to agents lacking channel membership |
| **Audit/compliance**  | Audit log, agent run traces                                 | Immutable, retention-configurable                                                                             |

## What to do next

Close the SSRF gap in `automations/automations.md` and the depth/width cap gap in `product/03-agents.md` as spec amendments: both are small, well-scoped additions that should land before `compliance-roadmap.md`'s SOC2 control mapping is written, since a SOC2 auditor will ask about exactly these.
