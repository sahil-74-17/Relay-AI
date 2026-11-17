"use client";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { api, fetcher } from "@/lib/api";
import type { Role, User } from "@/lib/types";

export function useSession() {
  const { data, error, isLoading, mutate } = useSWR<{ user: User }>("/auth/me", fetcher, { shouldRetryOnError: false, revalidateOnFocus: false });
  const router = useRouter();
  const user = data?.user;
  return {
    user,
    isLoading,
    error,
    isStaff: user?.role === "AGENT" || user?.role === "ADMIN",
    hasRole: (...roles: Role[]) => !!user && roles.includes(user.role),
    async logout() {
      await api("/auth/logout", { method: "POST" }).catch(() => undefined);
      await mutate(undefined, { revalidate: false });
      router.replace("/login");
    },
  };
}
