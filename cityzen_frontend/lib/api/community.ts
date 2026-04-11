import { apiRequest } from "@/lib/api/http";
import type {
  CommunityGroup,
  CommunityGroupCreateRequest,
  CommunityMessage,
  CommunityMessageCreateRequest,
} from "@/lib/api/types";

export function getCommunityGroups() {
  return apiRequest<CommunityGroup[]>("/community/groups/", {
    method: "GET",
  });
}

export function createCommunityGroup(payload: CommunityGroupCreateRequest, token: string) {
  const formData = new FormData();
  formData.append("groupchat_name", payload.groupchat_name);
  formData.append("is_private", String(Boolean(payload.is_private)));
  if (payload.banner) {
    formData.append("banner", payload.banner);
  }

  return apiRequest<CommunityGroup>("/community/groups/", {
    method: "POST",
    body: formData,
    token,
  });
}

export function joinCommunityGroup(groupId: number, token: string) {
  return apiRequest<{ detail: string }>(`/community/groups/${groupId}/join/`, {
    method: "POST",
    token,
  });
}

export function leaveCommunityGroup(groupId: number, token: string) {
  return apiRequest<{ detail: string }>(`/community/groups/${groupId}/leave/`, {
    method: "POST",
    token,
  });
}

export function getCommunityMessages(groupId: number, token?: string) {
  return apiRequest<CommunityMessage[]>(`/community/groups/${groupId}/messages/`, {
    method: "GET",
    token,
  });
}

export function createCommunityMessage(
  groupId: number,
  payload: CommunityMessageCreateRequest,
  token: string,
) {
  const formData = new FormData();
  if (payload.body) formData.append("body", payload.body);
  if (payload.file) formData.append("file", payload.file);
  if (payload.voice_note) formData.append("voice_note", payload.voice_note);
  if (payload.duration !== undefined && payload.duration !== null) {
    formData.append("duration", String(payload.duration));
  }

  return apiRequest<CommunityMessage>(`/community/groups/${groupId}/messages/`, {
    method: "POST",
    body: formData,
    token,
  });
}

export function softDeleteCommunityMessage(groupId: number, messageId: number, token: string) {
  return apiRequest<{ detail: string }>(`/community/groups/${groupId}/messages/${messageId}/soft-delete/`, {
    method: "POST",
    token,
  });
}

export function markCommunityMessageSeen(groupId: number, messageId: number, token: string) {
  return apiRequest<{ detail: string }>(`/community/groups/${groupId}/messages/${messageId}/mark-seen/`, {
    method: "POST",
    token,
  });
}
