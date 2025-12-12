import { randomBytes } from "crypto";

export function generateShareSlug(): string {
  return randomBytes(24).toString("base64url");
}

export function generateDeleteToken(): string {
  return randomBytes(24).toString("base64url");
}

