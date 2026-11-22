/** Mirrors internal-docs/product/02-core-concepts.md § Reaction, pin, bookmark */
export interface Pin {
  id: `pin_${string}`;
  channelId: string;
  messageId: string;
  pinnedBy: string;
  createdAt: string;
}

export interface CreatePinRequest {
  messageId: string;
}
