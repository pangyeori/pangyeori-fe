import { z } from "zod";

export const debateCreateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "토론 주제를 입력해주세요.")
    .max(100, "토론 주제는 100자 이하여야 합니다."),
  description: z.string().trim(),
  hostPosition: z.enum(["PROS", "CONS"]),
  turnTimeSeconds: z
    .number()
    .int()
    .min(30, "발언 시간은 30초 이상이어야 합니다.")
    .max(600, "발언 시간은 600초 이하여야 합니다."),
  freeDebateTimeSeconds: z
    .number()
    .int()
    .min(60, "자유 토론 시간은 60초 이상이어야 합니다.")
    .max(1800, "자유 토론 시간은 1,800초 이하여야 합니다."),
});

export type DebateCreateFormValues = z.infer<typeof debateCreateSchema>;
