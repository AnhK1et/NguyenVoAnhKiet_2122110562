import axios from "axios";

export const API_BASE =
  process.env.REACT_APP_API_BASE ??
  "http://localhost:5021/api";

const stored = localStorage.getItem("nom_user");
const storedUser = stored ? JSON.parse(stored) : null;

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
  headers: storedUser?.token
    ? { Authorization: `Bearer ${storedUser.token}` }
    : {},
});

export function formatApiError(e) {
  const status = e?.response?.status;
  const statusText = e?.response?.statusText;
  const message = e?.message;
  const code = e?.code;
  const url = e?.config?.baseURL && e?.config?.url ? `${e.config.baseURL}${e.config.url}` : null;
  const method = e?.config?.method ? String(e.config.method).toUpperCase() : null;
  const tried = Array.isArray(e?._triedPaths) ? e._triedPaths : null;
  const picked = e?._pickedPath ? String(e._pickedPath) : null;

  let serverMsg = null;
  const data = e?.response?.data;
  if (typeof data === "string") serverMsg = data.slice(0, 260);
  else if (data && typeof data === "object") {
    serverMsg =
      data.message ??
      data.error ??
      data.title ??
      (typeof data.detail === "string" ? data.detail : null);
    if (!serverMsg) {
      try {
        serverMsg = JSON.stringify(data).slice(0, 260);
      } catch {
        serverMsg = "[unserializable response]";
      }
    }
  }
  const parts = [];
  if (status) parts.push(`HTTP ${status}${statusText ? ` (${statusText})` : ""}`);
  if (code) parts.push(code);
  if (message) parts.push(message);
  if (method && url) parts.push(`${method} ${url}`);
  if (picked) parts.push(`endpoint: ${picked}`);
  if (tried?.length) parts.push(`tried: ${tried.join(", ")}`);
  if (serverMsg) parts.push(`server: ${serverMsg}`);
  return parts.join(" • ") || "Unknown error";
}

export function normalizeListPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.value)) return payload.value;
  return [];
}

export async function getFirst(paths) {
  let lastErr = null;
  const tried = [];
  for (const p of paths) {
    tried.push(p);
    try {
      return await api.get(p);
    } catch (e) {
      e._pickedPath = p;
      e._triedPaths = tried.slice();
      lastErr = e;
    }
  }
  throw lastErr;
}

