"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { signUp } from "@/features/auth/api/signUp";
import { useAuth } from "@/features/auth/context/AuthProvider";
import type { SignUpRequest } from "@/types/auth";

export function useSignUp() {
  const router = useRouter();
  const { setSession } = useAuth();

  return useMutation({
    mutationFn: (body: SignUpRequest) => signUp(body),
    onSuccess: (data, variables) => {
      setSession(data.accessToken, data.user, Boolean(variables.rememberMe));
      router.push("/");
    },
  });
}
