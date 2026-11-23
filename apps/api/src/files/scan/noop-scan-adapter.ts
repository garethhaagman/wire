import type { ScanAdapter } from "./scan-adapter.interface.js";

/** Zero-config default — see scan-adapter.interface.ts. Every upload is marked clean, never scanned for real. */
export class NoopScanAdapter implements ScanAdapter {
  scan(_input: { key: string }): Promise<"clean" | "infected"> {
    return Promise.resolve("clean");
  }
}
