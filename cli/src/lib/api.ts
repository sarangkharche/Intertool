import { getConfig } from "./config.js";

function httpMessage(status: number): string {
  switch (status) {
    case 401: return "Not authenticated. Run: intertool login --url <url>";
    case 403: return "Permission denied";
    case 404: return "Not found";
    case 429: return "Rate limited. Try again in a moment.";
    default:  return `HTTP ${status}`;
  }
}

async function request(method: string, path: string, opts?: { body?: unknown; rawBody?: BodyInit; headers?: Record<string, string> }): Promise<unknown> {
  const config = getConfig();
  const headers: Record<string, string> = { ...opts?.headers };
  if (config.token) {
    headers["Authorization"] = `Bearer ${config.token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${config.apiUrl}${path}`, {
      method,
      headers,
      body: opts?.rawBody ?? (opts?.body ? JSON.stringify(opts.body) : undefined),
    });
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error(`Cannot connect to ${config.apiUrl}. Is the server running?`);
    }
    throw err;
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error || httpMessage(res.status)
    );
  }
  return res.json();
}

export async function apiGet(path: string): Promise<unknown> {
  return request("GET", path);
}

export async function apiPost(path: string, body: unknown): Promise<unknown> {
  return request("POST", path, {
    body,
    headers: { "Content-Type": "application/json" },
  });
}

export async function apiPostForm(path: string, formData: FormData): Promise<unknown> {
  return request("POST", path, { rawBody: formData });
}
