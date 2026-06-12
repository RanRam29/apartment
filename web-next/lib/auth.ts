export interface DecodedToken {
  id: string;
  email: string;
  role: string;
  activeRole: string;
  firstName: string;
  lastName: string;
  iat: number;
  exp: number;
}

function base64UrlDecode(input: string): string {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, "=");
  return atob(padded);
}

export function decodeToken(token: string): DecodedToken | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    return JSON.parse(base64UrlDecode(payload));
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded) return true;
  return decoded.exp * 1000 < Date.now();
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("dirapp_token");
  if (!token) return null;
  if (isTokenExpired(token)) {
    localStorage.removeItem("dirapp_token");
    return null;
  }
  return token;
}

export function setToken(token: string): void {
  localStorage.setItem("dirapp_token", token);
}

export function removeToken(): void {
  localStorage.removeItem("dirapp_token");
}

export function getUser(): DecodedToken | null {
  const token = getToken();
  if (!token) return null;
  return decodeToken(token);
}
