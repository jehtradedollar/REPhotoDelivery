import { randomBytes } from "node:crypto";

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

/** Short, URL-safe, prefixed ids like prj_k3j9x0q2m1ab. */
export function newId(prefix: string, len = 12) {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return `${prefix}_${out}`;
}

/** Unguessable token for share links (32 hex chars, 128 bits). */
export function newToken() {
  return randomBytes(16).toString("hex");
}
