/**
 * Universal response envelope. Every endpoint returns this shape regardless of HTTP
 * status — see internal-docs/api/README.md § Response envelope and the API design
 * skill (skills/api-design) for the full rationale. SDKs need exactly one generic
 * handler because every response follows this contract.
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  meta: ApiMeta;
}

export interface ApiErrorDetail {
  field?: string;
  code: string;
  message: string;
}

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: ApiErrorDetail[];
}

export interface ApiMeta {
  request_id: string;
  api_version: string;
  pagination?: ApiPagination;
  cursor?: ApiCursorPagination;
}

export interface ApiPagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

/**
 * Keyset pagination for high-volume collections (messages, thread replies, events)
 * where OFFSET/COUNT(*) don't scale — see internal-docs/api/pagination.md. Pass
 * `next_cursor` back as `cursor` to fetch the next page.
 */
export interface ApiCursorPagination {
  per_page: number;
  has_more: boolean;
  next_cursor: string | null;
}

/**
 * Stable, machine-readable error codes. error.code must never change once shipped —
 * error.message may change freely. See internal-docs/api/errors.md.
 */
export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "AUTHENTICATION_ERROR"
  | "PERMISSION_DENIED"
  | "RESOURCE_NOT_FOUND"
  | "RESOURCE_CONFLICT"
  | "RATE_LIMIT_EXCEEDED"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE";

export function successEnvelope<T>(
  data: T,
  meta: Omit<ApiMeta, "request_id" | "api_version"> & Partial<Pick<ApiMeta, "request_id" | "api_version">>,
  requestId: string,
  apiVersion: string,
): ApiResponse<T> {
  return {
    success: true,
    data,
    error: null,
    meta: {
      request_id: meta.request_id ?? requestId,
      api_version: meta.api_version ?? apiVersion,
      ...(meta.pagination ? { pagination: meta.pagination } : {}),
    },
  };
}

export function errorEnvelope(
  error: ApiError,
  requestId: string,
  apiVersion: string,
): ApiResponse<null> {
  return {
    success: false,
    data: null,
    error,
    meta: {
      request_id: requestId,
      api_version: apiVersion,
    },
  };
}
