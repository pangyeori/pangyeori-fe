"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { signIn } from "@/features/auth/api/signIn";
import { useAuth } from "@/features/auth/context/AuthProvider";
import type { SignInRequest } from "@/types/auth";

export function useSignIn() {
  const router = useRouter();
  const { setSession } = useAuth();

  return useMutation({
    mutationFn: (body: SignInRequest) => signIn(body),
    onSuccess: (data, variables) => {
      setSession(data.accessToken, data.user, Boolean(variables.rememberMe));
      router.push("/");
    },
  });
}
