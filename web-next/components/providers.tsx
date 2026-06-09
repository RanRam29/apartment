"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { AuthContext } from "@/hooks/useAuth";
import { getToken, setToken, removeToken, decodeToken } from "@/lib/auth";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = getToken();
    if (stored) {
      const decoded = decodeToken(stored);
      if (decoded) {
        setTokenState(stored);
        api<{ user: User }>("/api/auth/me", { token: stored })
          .then((res) => setUser(res.user))
          .catch(() => {
            removeToken();
            setTokenState(null);
          })
          .finally(() => setIsLoading(false));
      } else {
        removeToken();
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback((newToken: string, newUser: User) => {
    setToken(newToken);
    setTokenState(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    removeToken();
    setTokenState(null);
    setUser(null);
  }, []);

  const switchRole = useCallback(
    async (newRole: "tenant" | "landlord") => {
      if (!token) return;
      try {
        await api<{ activeRole: string }>(
          "/api/auth/switch-role",
          { method: "PATCH", body: { role: newRole }, token }
        );
        const res = await api<{ user: User }>("/api/auth/me", { token });
        setUser(res.user);
      } catch (e) {
        console.error("Switch role failed:", e);
      }
    },
    [token]
  );

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, switchRole }}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        {children}
      </ThemeProvider>
    </AuthContext.Provider>
  );
}

