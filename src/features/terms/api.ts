import { z } from "zod";
import { apiClient } from "@/lib/api/client";

const termsSchema = z.array(z.object({
  termsId: z.string().min(1), type: z.string().min(1), version: z.number().int(),
  title: z.string().min(1), content: z.string().min(1), required: z.boolean(), effectiveAt: z.string().min(1),
}));

async function readTerms(path: string, token?: string) {
  const result = termsSchema.safeParse(await apiClient<unknown>(path, { token }));
  if (!result.success || new Set(result.data.map((term) => term.termsId)).size !== result.data.length) {
    throw new Error("약관 정보를 확인하지 못했습니다. 다시 시도해주세요.");
  }
  return result.data;
}

export const getLatestTerms = () => readTerms("/api/v1/terms");
export const getPendingTerms = (token: string) => readTerms("/api/v1/users/me/term-agreements/pending", token);

export function agreeTerms(termsIds: string[], token: string) {
  return apiClient<void>("/api/v1/users/me/term-agreements", {
    method: "POST", body: { termsIds }, token,
  });
}

export function changeTermsAgreement(termsId: string, agreed: boolean, token: string) {
  return apiClient<void>(`/api/v1/users/me/term-agreements/${encodeURIComponent(termsId)}`, {
    method: "PUT", body: { agreed }, token,
  });
}
