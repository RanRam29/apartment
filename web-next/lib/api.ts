const API_BASE = "";

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  token?: string;
};

class ApiError extends Error {
  status: number;
  data: Record<string, string> | null;

  constructor(message: string, status: number, data?: Record<string, string> | null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data ?? null;
  }
}

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("dirapp_token");
}

export async function api<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, headers = {}, token } = options;

  const authToken = token || getStoredToken();

  const config: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...headers,
    },
  };

  if (body && method !== "GET") {
    config.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${endpoint}`, config);

  if (!res.ok) {
    let data;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    throw new ApiError(
      data?.message || data?.error || `API Error ${res.status}`,
      res.status,
      data
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function apiUpload<T = unknown>(
  endpoint: string,
  formData: FormData,
  token?: string
): Promise<T> {
  const authToken = token || getStoredToken();

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    let data;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    throw new ApiError(
      data?.message || `Upload Error ${res.status}`,
      res.status,
      data
    );
  }

  return res.json();
}

export { ApiError, API_BASE };
