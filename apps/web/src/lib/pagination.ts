import type { ApiCursorPagination, ApiPagination } from "@wire/types";

/** Query params for every offset-paginated collection endpoint — mirrors PaginationQueryDto. */
export interface OffsetPageParams {
  filter?: Record<string, string>;
  page?: number;
  per_page?: number;
  search?: string;
  sort?: string;
}

/** Query params for every keyset-paginated collection endpoint — mirrors CursorQueryDto. */
export interface CursorPageParams {
  after_seq?: number;
  cursor?: string;
  per_page?: number;
}

export interface OffsetPage<T> {
  items: T[];
  pagination: ApiPagination;
}

export interface CursorPage<T> {
  cursor: ApiCursorPagination;
  items: T[];
}

/**
 * Builds a `?a=1&b=2` query string, skipping undefined values and flattening
 * `filter: {x: "y"}` into `filter[x]=y` per PaginationQueryDto's convention.
 * Accepts any plain params object (OffsetPageParams, CursorPageParams, or a
 * feature's own extension of either) rather than forcing every one of those
 * interfaces to carry an index signature just to satisfy this helper.
 */
export function buildQueryString(
  // biome-ignore lint/suspicious/noExplicitAny: params objects are heterogeneous per-endpoint DTOs, not a single shape
  params: Record<string, any>
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }
    if (
      key === "filter" &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      for (const [field, filterValue] of Object.entries(
        value as Record<string, string>
      )) {
        search.set(`filter[${field}]`, filterValue);
      }
      continue;
    }
    search.set(key, String(value));
  }
  return search.toString();
}
