import { z } from "zod";

import { passwordSchema } from "@/features/auth/schemas/passwordSchema";

export const passwordResetRequestSchema = z.object({
  email: z
    .string()
    .min(1, "이메일을 입력해주세요.")
    .email("이메일 형식으로 입력해주세요."),
});

export const passwordResetConfirmSchema = z
  .object({
    password: passwordSchema,
    passwordConfirm: z.string().min(1, "비밀번호 확인을 입력해주세요."),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["passwordConfirm"],
  });

export type PasswordResetRequestValues = z.infer<
  typeof passwordResetRequestSchema
>;
export type PasswordResetConfirmValues = z.infer<
  typeof passwordResetConfirmSchema
>;
