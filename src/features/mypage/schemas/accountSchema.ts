import { z } from "zod";

import { passwordSchema } from "@/features/auth/schemas/passwordSchema";
import { nicknameSchema } from "@/features/auth/schemas/registerSchema";

export const nicknameUpdateSchema = z.object({
  nickname: nicknameSchema,
});

export type NicknameUpdateFormValues = z.infer<typeof nicknameUpdateSchema>;

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "현재 비밀번호를 입력해주세요."),
    newPassword: passwordSchema,
    newPasswordConfirm: z
      .string()
      .min(1, "새 비밀번호 확인을 입력해주세요."),
  })
  .refine((data) => data.newPassword === data.newPasswordConfirm, {
    message: "새 비밀번호가 일치하지 않습니다.",
    path: ["newPasswordConfirm"],
  });

export type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>;
