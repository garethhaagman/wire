/** Mirrors internal-docs/product/02-core-concepts.md § Reaction, pin, bookmark */
export interface Reaction {
  actorId: string;
  createdAt: string;
  emoji: string;
  id: `rxn_${string}`;
  messageId: string;
}

export interface CreateReactionRequest {
  emoji: string;
}
