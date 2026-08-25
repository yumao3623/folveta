import { createHash, randomBytes } from "node:crypto";

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function stableId(...parts: Array<string | number>) {
  return createHash("sha256").update(parts.join("\u001f")).digest("hex");
}
