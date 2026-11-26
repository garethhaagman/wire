import type {
  CreateUploadRequest,
  CreateUploadResponse,
  DownloadUrlResponse,
  WireFile,
} from "@wire/types";
import { apiFetch, apiFetchEnvelope } from "@/lib/api-client.js";
import type { OffsetPage, OffsetPageParams } from "@/lib/pagination.js";
import { buildQueryString } from "@/lib/pagination.js";

export function getFile(fileId: string): Promise<WireFile> {
  return apiFetch<WireFile>(`/v1/files/${fileId}`);
}

export function requestUpload(
  body: CreateUploadRequest
): Promise<CreateUploadResponse> {
  return apiFetch<CreateUploadResponse>("/v1/files/upload-requests", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function confirmUpload(fileId: string): Promise<WireFile> {
  return apiFetch<WireFile>(`/v1/files/${fileId}/confirm`, { method: "POST" });
}

export function getDownloadUrl(fileId: string): Promise<DownloadUrlResponse> {
  return apiFetch<DownloadUrlResponse>(`/v1/files/${fileId}/download-url`);
}

export async function listChannelFiles(
  channelId: string,
  params: OffsetPageParams = {}
): Promise<OffsetPage<WireFile>> {
  const qs = buildQueryString(params);
  const body = await apiFetchEnvelope<WireFile[]>(
    `/v1/channels/${channelId}/files${qs ? `?${qs}` : ""}`
  );
  return {
    items: body.data ?? [],
    pagination: body.meta.pagination ?? {
      page: 1,
      per_page: 20,
      total: 0,
      total_pages: 1,
    },
  };
}

/**
 * The signed `uploadUrl` from requestUpload() is the bytes' actual destination
 * (S3 directly, or the API's local-disk HMAC-token route in dev) — it is not
 * a Wire API envelope endpoint, so this bypasses apiFetch entirely.
 */
export async function putFileBytes(
  uploadUrl: string,
  file: File,
  headers?: Record<string, string>
): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: headers ?? { "Content-Type": file.type },
  });
  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status}`);
  }
}

/** Full attach-a-file flow: create the record, PUT the bytes, then confirm. */
export async function uploadFile(
  channelId: string,
  file: File
): Promise<WireFile> {
  const {
    file: created,
    uploadUrl,
    headers,
  } = await requestUpload({
    channelId,
    name: file.name,
    mime: file.type || "application/octet-stream",
    sizeBytes: file.size,
  });
  await putFileBytes(uploadUrl, file, headers);
  return confirmUpload(created.id);
}
