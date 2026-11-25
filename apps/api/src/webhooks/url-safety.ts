import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/** A failed delivery attempt — recorded on the delivery row, never surfaced over HTTP. */
export class WebhookDeliveryError extends Error {}

/**
 * SSRF guard for outbound webhook requests: refuses hosts that resolve to
 * loopback, private, link-local (incl. cloud metadata 169.254.169.254), CGNAT, or
 * unspecified addresses. Checked at delivery time, not just at registration, since
 * DNS can change after an endpoint is created.
 */
export async function assertPublicHost(hostname: string): Promise<void> {
  const host = hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host)
    ? [host]
    : (await lookup(host, { all: true, verbatim: true })).map((a) => a.address);
  for (const address of addresses) {
    if (isPrivateAddress(address)) {
      throw new WebhookDeliveryError(`${hostname} resolves to a non-public address`);
    }
  }
}

function isPrivateAddress(address: string): boolean {
  const mapped = address.toLowerCase().startsWith("::ffff:") ? address.slice(7) : address;
  if (isIP(mapped) === 4) {
    const [a = 0, b = 0] = mapped.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  const lower = mapped.toLowerCase();
  return (
    lower === "::" ||
    lower === "::1" ||
    lower.startsWith("fc") ||
    lower.startsWith("fd") ||
    lower.startsWith("fe8") ||
    lower.startsWith("fe9") ||
    lower.startsWith("fea") ||
    lower.startsWith("feb")
  );
}
