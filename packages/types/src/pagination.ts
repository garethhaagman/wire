/** Shared query params for every collection endpoint — see internal-docs/api/pagination.md */
export interface ListQuery {
  filter?: Record<string, string>;
  page?: number;
  per_page?: number;
  search?: string;
  sort?: string;
}
