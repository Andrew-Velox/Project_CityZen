const ACCESS_TOKEN_KEY = "cityzen_access_token";
const REFRESH_TOKEN_KEY = "cityzen_refresh_token";

function isClient() {
  return typeof window !== "undefined";
}

export function getAccessToken() {
  if (!isClient()) return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  if (!isClient()) return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(access: string, refresh: string) {
  if (!isClient()) return;
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

export function clearTokens() {
  if (!isClient()) return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}
