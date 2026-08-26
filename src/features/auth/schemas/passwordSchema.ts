import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(1, "비밀번호를 입력해주세요.")
  .refine(
    (value) =>
      value.length >= 8 &&
      value.length <= 64 &&
      /[^A-Za-z0-9]/.test(value),
    "비밀번호는 8~64자이며 특수문자를 포함해야 합니다.",
  );
