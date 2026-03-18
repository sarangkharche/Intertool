import { getConfig } from "./config.js";

export async function apiGet(path: string): Promise<unknown> {
  const config = getConfig();
  const headers: Record<string, string> = {};
  if (config.token) {
    headers["Authorization"] = `Bearer ${config.token}`;
  }

  const res = await fetch(`${config.apiUrl}${path}`, { headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error || `HTTP ${res.status}`
    );
  }
  return res.json();
}

export async function apiPost(
  path: string,
  body: unknown
): Promise<unknown> {
  const config = getConfig();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.token) {
    headers["Authorization"] = `Bearer ${config.token}`;
  }

  const res = await fetch(`${config.apiUrl}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const resBody = await res.json().catch(() => ({}));
    throw new Error(
      (resBody as { error?: string }).error || `HTTP ${res.status}`
    );
  }
  return res.json();
}
