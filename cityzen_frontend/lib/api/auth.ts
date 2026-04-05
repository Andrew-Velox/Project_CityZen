import { apiRequest } from "@/lib/api/http";
import type {
  ChangePasswordRequest,
  DeleteAccountRequest,
  LoginRequest,
  LoginResponse,
  SignupRequest,
  SignupResponse,
  UpdateProfileRequest,
  UserProfile,
} from "@/lib/api/types";

export function login(payload: LoginRequest) {
  return apiRequest<LoginResponse>("/user/login/", {
    method: "POST",
    body: payload,
  });
}

export function signup(payload: SignupRequest) {
  return apiRequest<SignupResponse>("/user/register/", {
    method: "POST",
    body: payload,
  });
}

export function getMyProfile(token: string) {
  return apiRequest<UserProfile[]>("/user/profile/", {
    method: "GET",
    token,
  });
}

export function refreshAccessToken(refresh: string) {
  return apiRequest<{ access: string }>("/user/refresh-token/", {
    method: "POST",
    body: { refresh },
  });
}

export function updateMyProfile(
  userId: number,
  payload: UpdateProfileRequest,
  token: string,
) {
  const formData = new FormData();

  if (payload.first_name !== undefined) formData.append("first_name", payload.first_name);
  if (payload.last_name !== undefined) formData.append("last_name", payload.last_name);
  if (payload.email !== undefined) formData.append("email", payload.email);
  if (payload.birth_date !== undefined) formData.append("birth_date", payload.birth_date);
  if (payload.gender !== undefined) formData.append("gender", payload.gender);
  if (payload.image) formData.append("image", payload.image);

  return apiRequest<Partial<UserProfile>>(`/user/profile/update/${userId}/`, {
    method: "PATCH",
    body: formData,
    token,
  });
}

export function changeMyPassword(
  userId: number,
  payload: ChangePasswordRequest,
  token: string,
) {
  return apiRequest<{ detail: string }>(`/user/change-password/${userId}/`, {
    method: "POST",
    body: payload,
    token,
  });
}

export function deleteMyAccount(payload: DeleteAccountRequest, token: string) {
  return apiRequest<{ detail: string }>("/user/account/delete_account/", {
    method: "DELETE",
    body: payload,
    token,
  });
}
