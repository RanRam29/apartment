"use client";

import { createContext, useContext } from "react";
import type { User } from "@/lib/types";

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  switchRole: (newRole: "tenant" | "landlord") => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
  switchRole: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}
