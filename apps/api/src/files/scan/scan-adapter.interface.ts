/**
 * Virus-scanning contract. NoopScanAdapter is the only implementation today — it
 * marks every upload "clean" immediately so virusScanStatus never gets stuck at
 * "pending" forever (the pre-existing state before this flow existed). A real
 * scanner (ClamAV, a cloud AV API, etc) can implement this same interface later
 * without any caller change — see select-scan-adapter.ts.
 */
export interface ScanAdapter {
  scan(input: { key: string }): Promise<"clean" | "infected">;
}
