"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/context/AuthProvider";
import {
  createProfileImageUploadUrl,
  deleteProfileImage,
  saveProfileImage,
  uploadProfileImageToStorage,
  validateProfileImage,
} from "@/features/mypage/api/profileImage";

const MY_PROFILE_QUERY_KEY = ["users", "me"] as const;

export function useProfileImage() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const validationMessage = validateProfileImage(file);
      if (validationMessage) throw new Error(validationMessage);
      if (!accessToken) throw new Error("로그인이 필요합니다.");

      const { objectKey, uploadUrl } = await createProfileImageUploadUrl(
        file,
        accessToken,
      );
      await uploadProfileImageToStorage(uploadUrl, file);
      await saveProfileImage(objectKey, accessToken);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: MY_PROFILE_QUERY_KEY }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!accessToken) throw new Error("로그인이 필요합니다.");
      await deleteProfileImage(accessToken);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: MY_PROFILE_QUERY_KEY }),
  });

  return { uploadMutation, deleteMutation };
}
