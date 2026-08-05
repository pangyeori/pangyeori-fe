import { z } from "zod";

export const signUpSchema = z.object({
  email: z
    .string()
    .min(1, "이메일을 입력해주세요.")
    .email("이메일 형식으로 입력해주세요."),
  password: z
    .string()
    .min(1, "비밀번호를 입력해주세요.")
    .refine(
      (value) => value.length >= 8 && /[^A-Za-z0-9]/.test(value),
      "비밀번호는 8자 이상이며 특수문자를 포함해야 합니다.",
    ),
  rememberMe: z.boolean(),
});

export type SignUpFormValues = z.infer<typeof signUpSchema>;
