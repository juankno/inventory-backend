import { randomInt } from "node:crypto";

import type { IdGenerator } from "../application/IdGenerator.ts";

// Alfabeto base32 de Crockford: sin I, L, O ni U (B-05).
const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export class Base32IdGenerator implements IdGenerator {
  generate(): string {
    let id = "INV-";
    for (let i = 0; i < 10; i++) id += CROCKFORD_ALPHABET[randomInt(CROCKFORD_ALPHABET.length)];
    return id;
  }
}
