import { ApiError, type ApiErrorPayload } from "@/lib/api/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://127.0.0.1:8000";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown | FormData;
  token?: string;
};

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const isFormData = options.body instanceof FormData;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || "GET",
    headers: {
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
    },
    body: options.body
      ? isFormData
        ? options.body
        : JSON.stringify(options.body)
      : undefined,
  });

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
