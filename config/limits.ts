export const UPLOAD_MAX_BYTES = Number.parseInt(
  process.env.UPLOAD_MAX_BYTES || "10485760",
  10
); // 10MB default

export const ROOM_TTL_DAYS = Number.parseInt(
  process.env.ROOM_TTL_DAYS || "30",
  10
);

export const AI_ENABLED = process.env.AI_ENABLED === "true";

export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

