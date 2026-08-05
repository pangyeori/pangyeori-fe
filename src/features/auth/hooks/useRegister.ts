"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { register } from "@/features/auth/api/register";
import type { RegisterRequest } from "@/types/auth";

export function useRegister() {
  const router = useRouter();

  return useMutation({
    mutationFn: (body: RegisterRequest) => register(body),
    onSuccess: () => {
      router.push("/signup");
    },
  });
}
