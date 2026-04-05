import { apiRequest } from "@/lib/api/http";
import type {
  Report,
  ReportComment,
  ReportCommentCreateRequest,
  ReportCreateRequest,
} from "@/lib/api/types";

export function createReport(payload: ReportCreateRequest, token: string) {
  const formData = new FormData();
  formData.append("title", payload.title);
  formData.append("description", payload.description);
  formData.append("category", payload.category);
  formData.append("area", payload.area);
  formData.append("location", payload.location);
  if (payload.file) {
    formData.append("file", payload.file);
  }
  if (payload.files?.length) {
    payload.files.slice(0, 3).forEach((image) => formData.append("upload_images", image));
  }

  return apiRequest<Report>("/report/reports/", {
    method: "POST",
    body: formData,
    token,
  });
}

export function getReports() {
  return apiRequest<Report[]>("/report/reports/", {
    method: "GET",
  });
}

export function updateReport(
  reportId: number,
  payload: Partial<ReportCreateRequest>,
  token: string,
) {
  const formData = new FormData();

  if (payload.title !== undefined) formData.append("title", payload.title);
  if (payload.description !== undefined) formData.append("description", payload.description);
  if (payload.category !== undefined) formData.append("category", payload.category);
  if (payload.area !== undefined) formData.append("area", payload.area);
  if (payload.location !== undefined) formData.append("location", payload.location);
  if (payload.file) formData.append("file", payload.file);
  if (payload.files?.length) {
    payload.files.slice(0, 3).forEach((image) => formData.append("upload_images", image));
  }

  return apiRequest<Report>(`/report/reports/${reportId}/`, {
    method: "PATCH",
    body: formData,
    token,
  });
}

export function getReportComments(reportId: number) {
  return apiRequest<ReportComment[]>(`/report/reports/${reportId}/comments/`, {
    method: "GET",
  });
}

export function createReportComment(
  reportId: number,
  payload: ReportCommentCreateRequest,
  token: string,
) {
  return apiRequest<ReportComment>(`/report/reports/${reportId}/comments/`, {
    method: "POST",
    body: payload,
    token,
  });
}
