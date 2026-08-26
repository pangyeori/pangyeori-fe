import { z } from "zod";

import { passwordSchema } from "@/features/auth/schemas/passwordSchema";

export const signInSchema = z.object({
  email: z
    .string()
    .min(1, "이메일을 입력해주세요.")
    .email("이메일 형식으로 입력해주세요."),
  password: passwordSchema,
});

export type SignInFormValues = z.infer<typeof signInSchema>;
