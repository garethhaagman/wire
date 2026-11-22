# Security and compliance

| Doc | Contents |
|-----|----------|
| [threat-model.md](./threat-model.md) | Adversarial read of the agent/automation/MCP model — SSRF, prompt injection, delegation abuse |
| [data-residency.md](./data-residency.md) | What region-pinning and multi-tenant isolation mean under self-hosting |
| [compliance-roadmap.md](./compliance-roadmap.md) | SOC 2 control mapping, GDPR erasure gap, sequencing |

Extends [api/auth-tenancy.md](../api/auth-tenancy.md) (mechanism) with the adversarial and compliance read (this folder). Informed by [stack/](../stack/) since self-hosting changes the trust boundary materially from a managed-SaaS default.
