import { randomBytes } from "node:crypto";

/**
 * Alphabet excludes look-alike characters (0/O, 1/l/I) so a token stays
 * transcribable if someone reads a link aloud or retypes it.
 */
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const TOKEN_LENGTH = 12;

/**
 * ~59 bits of entropy. The token is the only thing protecting a meeting's
 * participant page, so it must come from a CSPRNG — Math.random() is
 * predictable and would make links guessable.
 *
 * Rejection sampling keeps the distribution uniform: taking `byte % 31`
 * would bias toward the first few letters, shrinking the real keyspace.
 */
export function generateShareToken(): string {
  let token = "";
  while (token.length < TOKEN_LENGTH) {
    for (const byte of randomBytes(TOKEN_LENGTH)) {
      if (byte >= 248) continue; // 248 = floor(256/31)*31 — discard the biased tail
      token += ALPHABET[byte % ALPHABET.length];
      if (token.length === TOKEN_LENGTH) break;
    }
  }
  return token;
}

/** Cheap shape check before hitting the database on an obviously bad URL. */
export function isValidShareTokenShape(token: string): boolean {
  return token.length === TOKEN_LENGTH && [...token].every((c) => ALPHABET.includes(c));
}
