import useSWR, { SWRConfiguration } from "swr";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

export function useApi<T = unknown>(
  endpoint: string | null,
  config?: SWRConfiguration
) {
  const { token } = useAuth();

  const { data, error, mutate, isValidating } = useSWR<T>(
    endpoint ? [endpoint, token] : null,
    ([url, t]) => api<T>(url as string, { token: t as string }),
    config
  );

  return {
    data,
    error,
    isLoading: !error && !data,
    isValidating,
    mutate,
  };
}
