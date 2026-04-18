export type ApiErrorPayload = {
  detail?: string;
  non_field_errors?: string[];
  [key: string]: unknown;
};

export class ApiError extends Error {
  status: number;
  payload: ApiErrorPayload | null;

  constructor(message: string, status: number, payload: ApiErrorPayload | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginResponse = {
  access: string;
  refresh: string;
};

export type SignupRequest = {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  confirm_password: string;
};

export type SignupResponse = {
  message: string;
  error?: string;
};

export type UserProfile = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  image: string | null;
  gender: string | null;
  birth_date: string | null;
  is_verified: boolean;
  is_staff?: boolean;
};

export type UpdateProfileRequest = {
  first_name?: string;
  last_name?: string;
  email?: string;
  birth_date?: string;
  gender?: string;
  image?: File | null;
};

export type ChangePasswordRequest = {
  new_password: string;
  confirm_password: string;
};

export type DeleteAccountRequest = {
  password: string;
};

export type ReportCreateRequest = {
  title: string;
  description: string;
  category: "danger" | "help" | "warning" | "healthy";
  area: string;
  location: string;
  file?: File | null;
  files?: File[];
};

export type ReportImageItem = {
  id: number;
  url: string;
  order: number;
};

export type ReportImageSlot =
  | { kind: "existing"; id: number }
  | { kind: "new" };

export type ReportUpdateRequest = Partial<ReportCreateRequest> & {
  image_slots?: ReportImageSlot[];
};

export type Report = {
  id: number;
  author: string;
  title: string;
  description: string;
  category: "danger" | "help" | "warning" | "healthy";
  area: string;
  location: string;
  file: string | null;
  images: string[];
  image_items?: ReportImageItem[];
  status: "pending" | "in_review" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
};

export type ReportComment = {
  id: number;
  author: string;
  report: number;
  parent: number | null;
  content: string;
  created_at: string;
  updated_at: string;
};

export type ReportCommentCreateRequest = {
  content: string;
  parent?: number | null;
};

export type FaqItem = {
  id: number;
  question: string;
  answer: string;
  category: "general" | "account" | "reporting" | "community" | "technical";
  order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CommunityGroup = {
  id: number;
  group_name: string;
  groupchat_name: string | null;
  admin: number | null;
  admin_username: string | null;
  members: number[];
  users_online: number[];
  is_private: boolean;
  banner: string | null;
  banner_url: string | null;
  created_at: string;
};

export type CommunityGroupCreateRequest = {
  groupchat_name: string;
  is_private?: boolean;
  banner?: File | null;
};

export type CommunityMessage = {
  id: number;
  message_uuid: string;
  group: number;
  author: number;
  author_username: string;
  author_image?: string | null;
  author_profile_url?: string | null;
  body: string | null;
  file: string | null;
  voice_note: string | null;
  duration: number | null;
  created: string;
  delete_msg: boolean;
  deleted_at: string | null;
  seen_by: number[];
  seen_count: number;
  is_seen_by_me: boolean;
  filename: string | null;
  is_image: boolean;
};

export type CommunityMessageCreateRequest = {
  body?: string;
  file?: File | null;
  voice_note?: File | null;
  duration?: number | null;
};

export type RagDocument = {
  id: number;
  user: string;
  title: string;
  file: string;
  uploaded_at: string;
  processed: boolean;
  processing_error: string | null;
  chunk_count: number;
  file_size: number | null;
  content_type: string | null;
};

export type RagQueryHistory = {
  id: number;
  user: string;
  document: number | null;
  query: string;
  response: string;
  created_at: string;
  top_k: number;
  latency_ms: number | null;
};

export type RagAskResponse = {
  history: RagQueryHistory;
  sources: string[];
};
