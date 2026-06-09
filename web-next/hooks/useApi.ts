"use client";

import useSWR, { type SWRConfiguration } from "swr";
import { api } from "@/lib/api";

export function useApi<T>(endpoint: string | null, config?: SWRConfiguration) {
  return useSWR<T>(
    endpoint,
    (url: string) => api<T>(url),
    {
      revalidateOnFocus: false,
      ...config,
    }
  );
}
