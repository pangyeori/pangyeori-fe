import { z } from "zod";

export const signInSchema = z.object({
  email: z
    .string()
    .min(1, "이메일을 입력해주세요.")
    .email("이메일 형식으로 입력해주세요."),
  password: z.string().min(1, "비밀번호를 입력해주세요."),
});

export type SignInFormValues = z.infer<typeof signInSchema>;
