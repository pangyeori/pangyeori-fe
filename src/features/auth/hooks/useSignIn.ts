"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { signIn } from "@/features/auth/api/signIn";
import { useAuth } from "@/features/auth/context/AuthProvider";
import { pendingTermsQueryOptions } from "@/features/terms/queries";
import type { SignInRequest } from "@/types/auth";

export function useSignIn(next?: string) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setSession } = useAuth();

  return useMutation({
    mutationFn: (body: SignInRequest) => signIn(body),
    onSuccess: async (data) => {
      // Prefetch keeps the form pending and caches failures for the gate's retry UI
      // without treating a terms service failure as invalid login credentials.
      await queryClient.prefetchQuery(pendingTermsQueryOptions(data.accessToken));
      setSession(data);
      router.push(next?.startsWith("/debates/") && !next.includes("\\") ? next : "/");
    },
  });
}
