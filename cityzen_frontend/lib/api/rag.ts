import { apiRequest } from "@/lib/api/http";
import type { RagAskResponse, RagDocument } from "@/lib/api/types";

export function listRagDocuments(token: string) {
  return apiRequest<RagDocument[]>("/rag/documents/", {
    method: "GET",
    token,
  });
}

export function uploadRagDocument(token: string, payload: { title: string; file: File }) {
  const formData = new FormData();
  formData.append("title", payload.title);
  formData.append("file", payload.file);

  return apiRequest<RagDocument>("/rag/documents/", {
    method: "POST",
    body: formData,
    token,
    timeoutMs: 30000,
  });
}

export function processRagDocument(token: string, documentId: number) {
  return apiRequest<RagDocument>(`/rag/documents/${documentId}/process/`, {
    method: "POST",
    body: {},
    token,
    timeoutMs: 60000,
  });
}

export function askRagQuestion(
  token: string,
  payload: { question: string; document?: number; top_k?: number },
) {
  return apiRequest<RagAskResponse>("/rag/queries/ask/", {
    method: "POST",
    body: payload,
    token,
    timeoutMs: 60000,
  });
}
