import { ApiError, type ApiErrorPayload } from "@/lib/api/types";
import { API_BASE_URL } from "@/config/api";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown | FormData;
  token?: string;
  timeoutMs?: number;
};

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 12000;
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  let requestBody: BodyInit | null | undefined;
  if (options.body === undefined) {
    requestBody = undefined;
  } else if (options.body === null) {
    requestBody = null;
  } else if (options.body instanceof FormData) {
    requestBody = options.body;
  } else {
    requestBody = JSON.stringify(options.body);
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method || "GET",
      headers: {
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
      },
      body: requestBody,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(`Request timed out after ${Math.round(timeoutMs / 1000)}s`, 408, null);
    }

    throw error;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson
    ? ((await response.json()) as ApiErrorPayload | T)
    : null;

  if (!response.ok) {
    const message =
      (payload as ApiErrorPayload | null)?.detail ||
      (payload as ApiErrorPayload | null)?.non_field_errors?.[0] ||
      `Request failed with status ${response.status}`;

    throw new ApiError(message, response.status, (payload as ApiErrorPayload) || null);
  }

  return payload as T;
}
