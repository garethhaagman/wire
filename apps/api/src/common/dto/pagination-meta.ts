import type { ApiPagination } from "@wire/types";

export function buildPaginationMeta(
  page: number,
  perPage: number,
  total: number
): ApiPagination {
  return {
    page,
    per_page: perPage,
    total,
    total_pages: Math.max(1, Math.ceil(total / perPage)),
  };
}
