/**
 * Minimal in-memory store for dummy/mock resources (members, channels, messages,
 * agents) that don't have real persistence yet — see internal-docs/product/04-implementation-roadmap.md.
 * Not for production use: single-instance, no persistence across restarts.
 */
export class InMemoryStore<T extends { id: string }> {
  private readonly items: T[];

  constructor(seed: T[] = []) {
    this.items = [...seed];
  }

  list(page: number, perPage: number): { items: T[]; total: number } {
    const start = (page - 1) * perPage;
    return {
      items: this.items.slice(start, start + perPage),
      total: this.items.length,
    };
  }

  findById(id: string): T | null {
    return this.items.find((item) => item.id === id) ?? null;
  }

  findAll(predicate: (item: T) => boolean): T[] {
    return this.items.filter(predicate);
  }

  findOne(predicate: (item: T) => boolean): T | null {
    return this.items.find(predicate) ?? null;
  }

  insert(item: T): T {
    this.items.push(item);
    return item;
  }

  /** Removes the first item matching the predicate; returns true if one was removed. */
  remove(predicate: (item: T) => boolean): boolean {
    const index = this.items.findIndex(predicate);
    if (index === -1) return false;
    this.items.splice(index, 1);
    return true;
  }
}
