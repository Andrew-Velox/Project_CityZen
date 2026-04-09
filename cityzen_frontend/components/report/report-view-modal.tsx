"use client";

import { FormEvent } from "react";
import { createPortal } from "react-dom";
import { API_BASE_URL } from "@/config/api";
import type { Report, ReportComment } from "@/lib/api/types";

type ReportViewModalProps = {
  isOpen: boolean;
  report: Report | null;
  comments: ReportComment[];
  commentsLoading: boolean;
  commentError: string | null;
  commentInput: string;
  commentSubmitting: boolean;
  imageUrls: string[];
  attachmentUrl: string | null;
  onClose: () => void;
  onEditReport?: (report: Report) => void;
  onCommentInputChange: (value: string) => void;
  onSubmitComment: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  formatDate: (dateString: string) => string;
};

function resolveProfileImageUrl(path: string | null) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/")) return `${API_BASE_URL}${path}`;
  return `${API_BASE_URL}/${path}`;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) return null;
  return value as Record<string, unknown>;
}

function getStringField(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function getAuthorImage(source: Record<string, unknown>) {
  const authorObject = toRecord(source.author);

  const raw = getStringField(source, [
    "author_image",
    "authorImage",
    "author_profile_image",
    "authorProfileImage",
    "profile_image",
    "profileImage",
    "user_image",
    "userImage",
    "image",
    "avatar",
  ]);

  const nestedRaw = authorObject
    ? getStringField(authorObject, [
        "image",
        "avatar",
        "profile_image",
        "profileImage",
        "user_image",
        "userImage",
      ])
    : null;

  return resolveProfileImageUrl(raw || nestedRaw);
}

function getAuthorProfileHref(source: Record<string, unknown>, fallbackAuthor: string) {
  const authorObject = toRecord(source.author);

  const directUrl = getStringField(source, ["author_profile_url", "authorProfileUrl", "profile_url", "profileUrl", "author_url", "authorUrl"]);
  if (directUrl) return directUrl;

  const nestedDirectUrl = authorObject
    ? getStringField(authorObject, ["profile_url", "profileUrl", "author_profile_url", "authorProfileUrl", "url"])
    : null;
  if (nestedDirectUrl) return nestedDirectUrl;

  const username =
    getStringField(source, ["author_username", "authorUsername", "username"]) ||
    (authorObject ? getStringField(authorObject, ["username", "author_username", "authorUsername"]) : null) ||
    fallbackAuthor;

  return `/profile?user=${encodeURIComponent(username)}`;
}

function getAuthorName(source: Record<string, unknown>, fallbackAuthor: string) {
  const authorObject = toRecord(source.author);

  const value =
    getStringField(source, ["author_name", "authorName", "author", "username"]) ||
    (authorObject ? getStringField(authorObject, ["username", "author", "name", "full_name", "fullName"]) : null) ||
    fallbackAuthor;

  return value;
}

function buildFallbackAvatar(name: string) {
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundType=gradientLinear&fontWeight=700`;
}

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || "U";
}

export default function ReportViewModal({
  isOpen,
  report,
  comments,
  commentsLoading,
  commentError,
  commentInput,
  commentSubmitting,
  imageUrls,
  attachmentUrl,
  onClose,
  onEditReport,
  onCommentInputChange,
  onSubmitComment,
  formatDate,
}: ReportViewModalProps) {
  if (!isOpen || !report || typeof document === "undefined") {
    return null;
  }

  const reportSource = report as unknown as Record<string, unknown>;
  const reportAuthorName = getAuthorName(reportSource, report.author);
  const reportAuthorImage = getAuthorImage(reportSource) || buildFallbackAvatar(reportAuthorName);
  const reportAuthorHref = getAuthorProfileHref(reportSource, reportAuthorName);

  return createPortal(
    <div
      className="fixed inset-0 z-[13000] grid place-items-center bg-slate-900/40 p-4 backdrop-blur-md transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-label="Report details"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="relative flex w-full max-w-2xl max-h-[90vh] flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl ring-1 ring-slate-900/5 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <header className="flex shrink-0 items-start justify-between border-b border-slate-100 bg-white px-6 py-5 sm:px-8">
          <div className="min-w-0 pr-4">
            <h2 className="text-xl font-bold leading-tight text-slate-900 sm:text-2xl">{report.title}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-medium text-slate-500">
              <span>Reported by</span>
              <a
                href={reportAuthorHref}
                className="inline-flex items-center gap-2 rounded-full px-1.5 py-0.5 transition hover:bg-slate-100"
              >
                {reportAuthorImage ? (
                  <img
                    src={reportAuthorImage}
                    alt={`${reportAuthorName} profile`}
                    className="h-7 w-7 rounded-full border border-slate-200 object-cover"
                  />
                ) : (
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-cyan-100 to-emerald-100 text-xs font-bold text-cyan-800">
                    {getInitial(reportAuthorName)}
                  </span>
                )}
                <span className="text-slate-700">{reportAuthorName}</span>
              </a>
              <span>•</span>
              <span>{formatDate(report.created_at)}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {onEditReport && (
              <button
                type="button"
                className="hidden items-center justify-center rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 sm:flex"
                onClick={() => {
                  onEditReport(report);
                  onClose();
                }}
              >
                Edit
              </button>
            )}
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
              onClick={onClose}
              aria-label="Close modal"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
          
          {/* Mobile Edit Button (Hidden on Desktop) */}
          {onEditReport && (
            <button
              type="button"
              className="mb-6 flex w-full items-center justify-center rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 sm:hidden"
              onClick={() => {
                onEditReport(report);
                onClose();
              }}
            >
              Edit Report
            </button>
          )}

          {/* Description */}
          <div className="prose prose-slate prose-sm max-w-none text-slate-700 sm:prose-base">
            <p className="whitespace-pre-wrap leading-relaxed">{report.description}</p>
          </div>

          {/* Metadata Grid Card */}
          <div className="mt-8 grid grid-cols-2 gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 sm:p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Category</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-flex items-center rounded-md bg-white px-2 py-1 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 capitalize">
                  {report.category}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Status</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-flex items-center rounded-md bg-white px-2 py-1 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 capitalize">
                  {report.status}
                </span>
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Area</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{report.area}</p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Location Coordinates</p>
              <p className="mt-1 font-mono text-sm font-medium text-slate-600">{report.location}</p>
            </div>
          </div>

          {/* Media Section */}
          {imageUrls.length > 0 ? (
            <div className="mt-8">
              <h3 className="mb-3 text-sm font-bold text-slate-900">Attached Media</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {imageUrls.map((imageUrl, index) => (
                  <a href={imageUrl} target="_blank" rel="noopener noreferrer" key={`${report.id}-image-${index}`} className="group relative aspect-video overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <img
                      src={imageUrl}
                      alt={`Report media ${index + 1}`}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
                  </a>
                ))}
              </div>
            </div>
          ) : attachmentUrl ? (
            <div className="mt-8">
              <h3 className="mb-3 text-sm font-bold text-slate-900">Attachment</h3>
              <a
                href={attachmentUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-600 shadow-sm transition hover:bg-slate-50 hover:text-blue-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open Document
              </a>
            </div>
          ) : null}

          {/* Discussion / Comments List */}
          <div className="mt-10">
            <h3 className="mb-4 text-lg font-bold text-slate-900">Discussion</h3>
            
            {commentError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                {commentError}
              </div>
            )}

            <div className="space-y-4 pb-4">
              {commentsLoading ? (
                <div className="flex items-center justify-center py-6 text-sm font-medium text-slate-500 animate-pulse">
                  Loading discussion...
                </div>
              ) : comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
                  <p className="text-sm font-medium text-slate-500">No comments yet.</p>
                  <p className="mt-1 text-xs text-slate-400">Be the first to share an update or ask a question.</p>
                </div>
              ) : (
                comments.map((comment) => {
                  const commentSource = comment as unknown as Record<string, unknown>;
                  const commentAuthorName = getAuthorName(commentSource, typeof comment.author === "string" ? comment.author : "User");
                  const commentAuthorImage = getAuthorImage(commentSource) || buildFallbackAvatar(commentAuthorName);
                  const commentAuthorHref = getAuthorProfileHref(commentSource, commentAuthorName);

                  return (
                  <article key={comment.id} className="flex gap-4">
                    <a
                      href={commentAuthorHref}
                      className="shrink-0"
                    >
                      <img
                        src={commentAuthorImage}
                        alt={`${commentAuthorName} profile`}
                        className="h-10 w-10 rounded-full border border-slate-200 object-cover"
                      />
                    </a>
                    <div className="flex-1 rounded-2xl rounded-tl-none bg-slate-50 p-4 text-sm text-slate-700">
                      <div className="mb-1 flex items-center gap-2">
                        <a
                          href={commentAuthorHref}
                          className="font-semibold text-slate-900 transition hover:text-cyan-700"
                        >
                          {commentAuthorName}
                        </a>
                        <span className="text-xs text-slate-500">{formatDate(comment.created_at)}</span>
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                    </div>
                  </article>
                );
                })
              )}
            </div>
          </div>
        </div>

        {/* Sticky Comment Input Footer */}
        <footer className="shrink-0 border-t border-slate-100 bg-slate-50/80 px-4 py-4 backdrop-blur-md sm:px-8">
          <form className="flex items-end gap-3" onSubmit={onSubmitComment}>
            <div className="relative flex-1">
              <textarea
                className="block min-h-[44px] w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-4 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                value={commentInput}
                onChange={(event) => onCommentInputChange(event.target.value)}
                placeholder="Write a comment..."
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (commentInput.trim() && !commentSubmitting) {
                      e.currentTarget.form?.requestSubmit();
                    }
                  }
                }}
              />
            </div>
            <button
              type="submit"
              disabled={commentSubmitting || !commentInput.trim()}
              className="flex h-[44px] shrink-0 items-center justify-center rounded-2xl bg-blue-600 px-5 font-semibold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {commentSubmitting ? (
                <svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                "Post"
              )}
            </button>
          </form>
          <p className="mt-2 px-1 text-center text-[10px] text-slate-400 sm:text-left">
            Press <kbd className="rounded bg-slate-200 px-1 font-sans">Enter</kbd> to post, <kbd className="rounded bg-slate-200 px-1 font-sans">Shift + Enter</kbd> for new line.
          </p>
        </footer>

      </section>
    </div>,
    document.body,
  );
}