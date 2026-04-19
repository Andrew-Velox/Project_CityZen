import { ApiError, type ApiErrorPayload } from "@/lib/api/types";
import { extractApiErrorPayloadMessage } from "@/lib/api/error-utils";
import { pushToast } from "@/lib/toast/events";
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
  const method = options.method || "GET";
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
      method,
      headers: {
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
      },
      body: requestBody,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      const timeoutMessage = `Request timed out after ${Math.round(timeoutMs / 1000)}s`;
      pushToast({ type: "error", title: "Request Failed", message: timeoutMessage });
      throw new ApiError(timeoutMessage, 408, null);
    }

    pushToast({
      type: "error",
      title: "Network Error",
      message: "Could not connect to the server. Please check your internet connection.",
    });

    throw error;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson
    ? ((await response.json()) as ApiErrorPayload | T)
    : null;

  if (!response.ok) {
    const message = extractApiErrorPayloadMessage(
      (payload as ApiErrorPayload | null) || null,
      `Request failed with status ${response.status}`,
    );

    pushToast({
      type: "error",
      title: "Request Failed",
      message,
    });

    throw new ApiError(message, response.status, (payload as ApiErrorPayload) || null);
  }

  const successPayload = payload as { message?: unknown; detail?: unknown } | null;
  const successMessage =
    typeof successPayload?.message === "string"
      ? successPayload.message.trim()
      : typeof successPayload?.detail === "string"
        ? successPayload.detail.trim()
        : "";

  if (method !== "GET" && successMessage) {
    pushToast({ type: "success", title: "Success", message: successMessage });
  }

  return payload as T;
}
