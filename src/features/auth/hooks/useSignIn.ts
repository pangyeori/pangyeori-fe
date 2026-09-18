"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { signIn } from "@/features/auth/api/signIn";
import { useAuth } from "@/features/auth/context/AuthProvider";
import type { SignInRequest } from "@/types/auth";

export function useSignIn(next?: string) {
  const router = useRouter();
  const { setSession } = useAuth();

  return useMutation({
    mutationFn: (body: SignInRequest) => signIn(body),
    onSuccess: (data) => {
      setSession(data);
      router.push(next?.startsWith("/debates/") && !next.includes("\\") ? next : "/");
    },
  });
}
