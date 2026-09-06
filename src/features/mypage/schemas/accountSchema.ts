import { z } from "zod";

import { nicknameSchema } from "@/features/auth/schemas/registerSchema";

export const nicknameUpdateSchema = z.object({
  nickname: nicknameSchema,
});

export type NicknameUpdateFormValues = z.infer<typeof nicknameUpdateSchema>;
