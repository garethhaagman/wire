import type { ApiResponse } from "@wire/types";

const API_URL = import.meta.env.VITE_API_URL;

export class ApiClientError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

/**
 * The one generic handler every endpoint call goes through — every response
 * follows the same {success, data, error, meta} envelope, so no endpoint-specific
 * unwrapping logic is ever needed here. See internal-docs/api/README.md.
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const body = (await res.json().catch(() => null)) as ApiResponse<T> | null;

  if (!body?.success) {
    throw new ApiClientError(
      body?.error?.code ?? "INTERNAL_ERROR",
      body?.error?.message ?? `Request failed: ${res.status}`
    );
  }

  return body.data as T;
}
