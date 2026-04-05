function resolveApiBaseUrl(): string {
  const envBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
  if (envBaseUrl) return envBaseUrl;

  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    const host = window.location.hostname;
    return `${protocol}//${host}:8000`;
  }

  return "http://127.0.0.1:8000";
}

export const API_BASE_URL = resolveApiBaseUrl();
