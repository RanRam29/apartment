"use client";

import useSWR, { type SWRConfiguration } from "swr";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

export function useApi<T>(endpoint: string | null, config?: SWRConfiguration) {
  const { token } = useAuth();

  return useSWR<T>(
    endpoint ? [endpoint, token] : null,
    ([url, t]) => api<T>(url as string, { token: t as string }),
    {
      revalidateOnFocus: false,
      ...config,
    }
  );
}
