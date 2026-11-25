import type { WireFile } from "@wire/types";
import { isoRequired, type Queryable } from "../database.js";
import { newId } from "../ids.js";

interface FileRow {
  id: string;
  workspace_id: string;
  channel_id: string;
  uploaded_by: string;
  name: string;
  mime: string;
  size_bytes: string;
  size_confirmed: boolean;
  storage_key: string;
  virus_scan_status: WireFile["virusScanStatus"];
  created_at: Date;
}

function toFile(row: FileRow): WireFile {
  return {
    id: row.id as WireFile["id"],
    workspaceId: row.workspace_id,
    channelId: row.channel_id,
    uploadedBy: row.uploaded_by,
    name: row.name,
    mime: row.mime,
    sizeBytes: Number(row.size_bytes),
    sizeConfirmed: row.size_confirmed,
    virusScanStatus: row.virus_scan_status,
    createdAt: isoRequired(row.created_at),
  };
}

export async function findFile(db: Queryable, id: string): Promise<WireFile | null> {
  const { rows } = await db.query<FileRow>(`select * from files where id = $1`, [id]);
  return rows[0] ? toFile(rows[0]) : null;
}

/** Internal — the storage key is never exposed on WireFile; only confirmUpload/download-url flows need it. */
export async function findFileStorageKey(
  db: Queryable,
  id: string,
): Promise<{ storageKey: string; workspaceId: string } | null> {
  const { rows } = await db.query<{ storage_key: string; workspace_id: string }>(
    `select storage_key, workspace_id from files where id = $1`,
    [id],
  );
  return rows[0] ? { storageKey: rows[0].storage_key, workspaceId: rows[0].workspace_id } : null;
}

export async function insertFile(
  db: Queryable,
  input: {
    workspaceId: string;
    channelId: string;
    uploadedBy: string;
    name: string;
    mime: string;
    sizeBytes: number;
    storageKey: string;
  },
): Promise<WireFile> {
  const { rows } = await db.query<FileRow>(
    `insert into files (id, workspace_id, channel_id, uploaded_by, name, mime, size_bytes, storage_key)
     values ($1, $2, $3, $4, $5, $6, $7, $8) returning *`,
    [
      newId("file"),
      input.workspaceId,
      input.channelId,
      input.uploadedBy,
      input.name,
      input.mime,
      input.sizeBytes,
      input.storageKey,
    ],
  );
  return toFile(rows[0]!);
}

/** Confirms the blob actually landed — overwrites size_bytes with the storage-verified size, never the client-claimed one. */
export async function markFileUploaded(
  db: Queryable,
  id: string,
  input: { sizeBytes: number },
): Promise<WireFile | null> {
  const { rows } = await db.query<FileRow>(
    `update files set size_confirmed = true, size_bytes = $2 where id = $1 returning *`,
    [id, input.sizeBytes],
  );
  return rows[0] ? toFile(rows[0]) : null;
}

export async function updateVirusScanStatus(
  db: Queryable,
  id: string,
  status: WireFile["virusScanStatus"],
): Promise<WireFile | null> {
  const { rows } = await db.query<FileRow>(
    `update files set virus_scan_status = $2 where id = $1 returning *`,
    [id, status],
  );
  return rows[0] ? toFile(rows[0]) : null;
}

export async function listChannelFiles(
  db: Queryable,
  channelId: string,
  page: number,
  perPage: number,
): Promise<{ items: WireFile[]; total: number }> {
  const [rows, count] = await Promise.all([
    db.query<FileRow>(
      `select * from files where channel_id = $1 order by created_at desc, id desc limit $2 offset $3`,
      [channelId, perPage, (page - 1) * perPage],
    ),
    db.query<{ total: number }>(`select count(*)::int as total from files where channel_id = $1`, [
      channelId,
    ]),
  ]);
  return { items: rows.rows.map(toFile), total: count.rows[0]?.total ?? 0 };
}
