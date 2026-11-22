import type { ApiPagination } from "@wire/types";

/**
 * Marker wrapper controllers return for collection endpoints so the response
 * interceptor (response-envelope.interceptor.ts) knows to attach meta.pagination
 * instead of hand-building the envelope in every controller method.
 */
export class PaginatedResult<T> {
  constructor(
    public readonly items: T[],
    public readonly pagination: ApiPagination,
  ) {}
}
