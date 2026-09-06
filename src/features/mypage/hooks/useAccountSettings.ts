"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { useAuth } from "@/features/auth/context/AuthProvider";
import {
  changePassword,
  withdrawAccount,
  type ChangePasswordRequest,
} from "@/features/mypage/api/account";

function useFinishSession(reason: "password-changed" | "withdrawn") {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { clearAuth } = useAuth();

  return () => {
    clearAuth();
    queryClient.clear();
    router.replace(`/signin?reason=${reason}`);
  };
}

export function usePasswordChange() {
  const { accessToken } = useAuth();
  const finishSession = useFinishSession("password-changed");

  return useMutation({
    mutationFn: async (body: ChangePasswordRequest) => {
      if (!accessToken) throw new Error("로그인이 필요합니다.");
      await changePassword(body, accessToken);
    },
    onSuccess: finishSession,
  });
}

export function useAccountWithdrawal() {
  const { accessToken } = useAuth();
  const finishSession = useFinishSession("withdrawn");

  return useMutation({
    mutationFn: async () => {
      if (!accessToken) throw new Error("로그인이 필요합니다.");
      await withdrawAccount(accessToken);
    },
    onSuccess: finishSession,
  });
}
