import { apiRequest } from "@/lib/api/http";
import type { FaqItem } from "@/lib/api/types";

export function getFaqs(category?: FaqItem["category"]) {
  const search = category ? `?category=${encodeURIComponent(category)}` : "";

  return apiRequest<FaqItem[]>(`/faq/faqs/${search}`, {
    method: "GET",
  });
}
