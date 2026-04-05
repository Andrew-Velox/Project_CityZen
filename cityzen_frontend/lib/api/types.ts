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
