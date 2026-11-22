import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

/**
 * Shared query params for every collection endpoint — internal-docs/api/pagination.md.
 * filter[field]=value params are read directly off the raw query object (ParsedFilterQuery)
 * since their keys are dynamic and can't be bound by a fixed DTO property.
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  per_page?: number = 20;

  @ApiPropertyOptional({ description: "Field to sort by; prefix with - for descending" })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

export function parseFilterQuery(rawQuery: Record<string, unknown>): Record<string, string> {
  const filter = rawQuery["filter"];
  if (!filter || typeof filter !== "object") return {};

  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(filter as Record<string, unknown>)) {
    if (typeof value === "string") result[key] = value;
  }
  return result;
}

export const SORT_DIRECTION = { ASC: "ASC", DESC: "DESC" } as const;
export type SortDirection = (typeof SORT_DIRECTION)[keyof typeof SORT_DIRECTION];

export function parseSort(sort: string | undefined): { field: string; direction: SortDirection } | null {
  if (!sort) return null;
  const direction: SortDirection = sort.startsWith("-") ? SORT_DIRECTION.DESC : SORT_DIRECTION.ASC;
  const field = sort.startsWith("-") ? sort.slice(1) : sort;
  return { field, direction };
}
