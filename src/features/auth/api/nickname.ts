import { apiClient } from "@/lib/api/client";

type NicknameDuplicateResponse = {
  duplicated: boolean;
};

export function checkNicknameDuplicate(nickname: string) {
  const query = new URLSearchParams({ nickname: nickname.trim() });

  return apiClient<NicknameDuplicateResponse>(
    `/api/v1/users/nickname/duplicate?${query.toString()}`,
  );
}
