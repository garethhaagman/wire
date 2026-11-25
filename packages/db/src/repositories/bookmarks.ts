import type { Bookmark } from "@wire/types";
import { isoRequired, type Queryable } from "../database.js";
import { newId } from "../ids.js";

interface BookmarkRow {
  created_at: Date;
  id: string;
  member_id: string;
  message_id: string;
  workspace_id: string;
}

function toBookmark(row: BookmarkRow): Bookmark {
  return {
    id: row.id as Bookmark["id"],
    workspaceId: row.workspace_id,
    memberId: row.member_id,
    messageId: row.message_id,
    createdAt: isoRequired(row.created_at),
  };
}

export async function listBookmarks(
  db: Queryable,
  memberId: string,
  page: number,
  perPage: number
): Promise<{ items: Bookmark[]; total: number }> {
  const [rows, count] = await Promise.all([
    db.query<BookmarkRow>(
      "select * from bookmarks where member_id = $1 order by created_at desc, id desc limit $2 offset $3",
      [memberId, perPage, (page - 1) * perPage]
    ),
    db.query<{ total: number }>(
      "select count(*)::int as total from bookmarks where member_id = $1",
      [memberId]
    ),
  ]);
  return { items: rows.rows.map(toBookmark), total: count.rows[0]?.total ?? 0 };
}

/** Returns null when the member already bookmarked this message. */
export async function insertBookmark(
  db: Queryable,
  input: { workspaceId: string; memberId: string; messageId: string }
): Promise<Bookmark | null> {
  const { rows } = await db.query<BookmarkRow>(
    `insert into bookmarks (id, workspace_id, member_id, message_id) values ($1, $2, $3, $4)
     on conflict (member_id, message_id) do nothing returning *`,
    [newId("bkm"), input.workspaceId, input.memberId, input.messageId]
  );
  return rows[0] ? toBookmark(rows[0]) : null;
}

export async function deleteBookmark(
  db: Queryable,
  memberId: string,
  id: string
): Promise<boolean> {
  const { rowCount } = await db.query(
    "delete from bookmarks where member_id = $1 and id = $2",
    [memberId, id]
  );
  return (rowCount ?? 0) > 0;
}
