/** Shared query params for every collection endpoint — see internal-docs/api/pagination.md */
export interface ListQuery {
  page?: number;
  per_page?: number;
  sort?: string;
  search?: string;
  filter?: Record<string, string>;
}
