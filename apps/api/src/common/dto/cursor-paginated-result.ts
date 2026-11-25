import { ApiPropertyOptional } from "@nestjs/swagger";
import type { ApiCursorPagination } from "@wire/types";
import { Type } from "class-transformer";
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from "class-validator";
import { ValidationException } from "../errors/api-exception.js";

const CURSOR_PATTERN = /^(?<dir>[ab]):(?<seq>\d{1,15})$/u;
const OPAQUE_CURSOR_PATTERN = /^[A-Za-z0-9_-]{1,64}$/u;

/**
 * Marker wrapper for keyset-paginated collections — the response interceptor
 * attaches meta.cursor instead of meta.pagination. See internal-docs/api/pagination.md.
 */
export class CursorPaginatedResult<T> {
  constructor(
    public readonly items: T[],
    public readonly cursor: ApiCursorPagination
  ) {}
}

export type CursorDirection = "before" | "after";

export interface DecodedCursor {
  direction: CursorDirection;
  seq: number;
}

/**
 * Cursors are opaque to clients (base64url of direction + seq) so the encoding can
 * change without an API version bump.
 */
export function encodeCursor(direction: CursorDirection, seq: number): string {
  return Buffer.from(
    `${direction === "before" ? "b" : "a"}:${seq}`,
    "utf8"
  ).toString("base64url");
}

export function decodeCursor(
  cursor: string | undefined
): DecodedCursor | undefined {
  if (!cursor) {
    return undefined;
  }
  const match = CURSOR_PATTERN.exec(
    Buffer.from(cursor, "base64url").toString("utf8")
  );
  if (!match?.groups) {
    throw new ValidationException([
      {
        field: "cursor",
        code: "INVALID_CURSOR",
        message: "cursor is malformed",
      },
    ]);
  }
  return {
    direction: match.groups.dir === "b" ? "before" : "after",
    seq: Number(match.groups.seq),
  };
}

export class CursorQueryDto {
  @ApiPropertyOptional({
    description:
      "Opaque cursor from a previous response's meta.cursor.next_cursor",
  })
  @IsOptional()
  @IsString()
  @Matches(OPAQUE_CURSOR_PATTERN)
  cursor?: string;

  @ApiPropertyOptional({
    minimum: 0,
    description:
      "Return items with seq greater than this, oldest first (catch-up after reconnect). Ignored when cursor is set.",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  after_seq?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  per_page?: number = 50;
}

/** Resolves cursor/after_seq into one keyset bound; `before` with no seq means "newest first from the head". */
export function resolveCursor(
  query: CursorQueryDto
): DecodedCursor | { direction: "before"; seq: undefined } {
  const decoded = decodeCursor(query.cursor);
  if (decoded) {
    return decoded;
  }
  if (query.after_seq !== undefined) {
    return { direction: "after", seq: query.after_seq };
  }
  return { direction: "before", seq: undefined };
}
