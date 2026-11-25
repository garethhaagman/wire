/** Mirrors internal-docs/product/02-core-concepts.md § Reaction, pin, bookmark */
export interface Pin {
  channelId: string;
  createdAt: string;
  id: `pin_${string}`;
  messageId: string;
  pinnedBy: string;
}

export interface CreatePinRequest {
  messageId: string;
}
