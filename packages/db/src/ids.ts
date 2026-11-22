import { randomBytes } from "node:crypto";

const CROCKFORD = "0123456789abcdefghjkmnpqrstvwxyz";

/**
 * `${prefix}_` + a 26-char ULID (48-bit ms timestamp + 80 random bits, Crockford
 * base32). Time-ordered ids keep B-tree inserts append-mostly on hot tables
 * (messages, events, audit) instead of splitting pages at random like a v4 id would.
 */
export function newId<P extends string>(prefix: P): `${P}_${string}` {
  let time = Date.now();
  const timeChars: string[] = [];
  for (let i = 0; i < 10; i++) {
    timeChars.unshift(CROCKFORD[time % 32]!);
    time = Math.floor(time / 32);
  }

  const random = randomBytes(10);
  let bits = 0;
  let value = 0;
  let randomChars = "";
  for (const byte of random) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      randomChars += CROCKFORD[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  return `${prefix}_${timeChars.join("")}${randomChars}`;
}
