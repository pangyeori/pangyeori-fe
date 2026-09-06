import { apiClient, ApiError } from "@/lib/api/client";
import type { UserProfileResponse } from "@/types/user";

export const PROFILE_IMAGE_ACCEPT = "image/png,image/jpeg,image/webp";
export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_PROFILE_IMAGE_TYPES = new Set(
  PROFILE_IMAGE_ACCEPT.split(","),
);

type UploadUrlResponse = {
  objectKey: string;
  uploadUrl: string;
  expiresInSeconds: number;
};

export function validateProfileImage(file: File) {
  if (!ALLOWED_PROFILE_IMAGE_TYPES.has(file.type)) {
    return "PNG, JPG, WebP 형식의 이미지만 업로드할 수 있습니다.";
  }
  if (file.size > PROFILE_IMAGE_MAX_BYTES) {
    return "프로필 이미지는 5MB 이하만 업로드할 수 있습니다.";
  }
  if (file.size === 0) {
    return "비어 있는 파일은 업로드할 수 없습니다.";
  }
  return null;
}

export function createProfileImageUploadUrl(file: File, token: string) {
  return apiClient<UploadUrlResponse>("/api/v1/storage/upload-urls", {
    method: "POST",
    token,
    body: {
      category: "PROFILE_IMAGE",
      contentType: file.type,
      contentLength: file.size,
    },
  });
}

export async function uploadProfileImageToStorage(
  uploadUrl: string,
  file: File,
) {
  let response: Response;
  try {
    response = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
  } catch {
    throw new ApiError(
      "이미지 저장소에 연결할 수 없습니다. 네트워크 상태를 확인하세요.",
      0,
    );
  }

  if (!response.ok) {
    throw new ApiError("이미지 업로드에 실패했습니다. 다시 시도해주세요.", response.status);
  }
}

export function saveProfileImage(objectKey: string, token: string) {
  return apiClient<UserProfileResponse>("/api/v1/users/me", {
    method: "PATCH",
    token,
    body: { profileImageKey: objectKey },
  });
}

export function deleteProfileImage(token: string) {
  return apiClient<void>("/api/v1/users/me/profile-image", {
    method: "DELETE",
    token,
  });
}
