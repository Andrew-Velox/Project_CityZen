import { ApiError, type ApiErrorPayload } from "@/lib/api/types";

function isGenericStatusMessage(message: string): boolean {
  return /^Request failed with status\s+\d+$/i.test(message.trim());
}

function stringifyValue(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item : String(item)))
      .filter(Boolean);
  }
  if (value === null || value === undefined) return [];
  return [String(value)];
}

export function collectPayloadMessages(payload: ApiErrorPayload | null): string[] {
  if (!payload) return [];

  const messages: string[] = [];

  if (typeof payload.detail === "string" && payload.detail.trim()) {
    messages.push(payload.detail.trim());
  }

  if (Array.isArray(payload.non_field_errors)) {
    messages.push(
      ...payload.non_field_errors
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    );
  }

  for (const [key, value] of Object.entries(payload)) {
    if (key === "detail" || key === "non_field_errors") continue;

    const values = stringifyValue(value)
      .map((item) => item.trim())
      .filter(Boolean);

    for (const entry of values) {
      messages.push(`${key}: ${entry}`);
    }
  }

  return Array.from(new Set(messages));
}

export function extractApiErrorMessage(error: ApiError, fallback: string): string {
  const payloadMessages = collectPayloadMessages(error.payload);

  if (payloadMessages.length > 0) {
    return payloadMessages.join("\n");
  }

  if (error.message && !isGenericStatusMessage(error.message)) {
    return error.message;
  }

  return fallback;
}

export function extractApiErrorPayloadMessage(
  payload: ApiErrorPayload | null,
  fallback: string,
): string {
  const payloadMessages = collectPayloadMessages(payload);
  if (payloadMessages.length > 0) {
    return payloadMessages.join("\n");
  }
  return fallback;
}