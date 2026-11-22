/** Mirrors internal-docs/product/02-core-concepts.md § Reaction, pin, bookmark */
export interface Reaction {
  id: `rxn_${string}`;
  messageId: string;
  actorId: string;
  emoji: string;
  createdAt: string;
}

export interface CreateReactionRequest {
  emoji: string;
}
