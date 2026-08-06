import { z } from "zod";

export const registerSchema = z
  .object({
    nickname: z
      .string()
      .min(1, "닉네임을 입력해주세요.")
      .min(2, "닉네임은 2~12자로 입력해주세요.")
      .max(12, "닉네임은 2~12자로 입력해주세요.")
      .regex(
        /^[A-Za-z0-9가-힣]+$/,
        "닉네임에는 특수문자를 사용할 수 없습니다.",
      ),
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
    passwordConfirm: z.string().min(1, "비밀번호 확인을 입력해주세요."),
    agreeService: z.boolean(),
    agreePrivacy: z.boolean(),
    agreeMarketing: z.boolean(),
    emailVerified: z.boolean(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["passwordConfirm"],
  })
  .refine((data) => data.emailVerified, {
    message: "이메일 인증을 완료해주세요.",
    path: ["emailVerified"],
  })
  .refine((data) => data.agreeService && data.agreePrivacy, {
    message: "필수 약관에 동의해주세요.",
    path: ["agreeService"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
