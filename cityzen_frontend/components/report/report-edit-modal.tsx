"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/config/api";
import type { Report, ReportImageItem, ReportImageSlot } from "@/lib/api/types";

type ReportModalImageSlot =
  | { kind: "existing"; id: number; url: string }
  | { kind: "new"; file: File; previewUrl: string };

export type ReportEditSubmitPayload = {
  title: string;
  description: string;
  category: "danger" | "help" | "warning" | "healthy";
  area: string;
  location: string;
  image_slots: ReportImageSlot[];
  files: File[];
};

type ReportEditModalProps = {
  isOpen: boolean;
  busy: boolean;
  error: string | null;
  report: Report | null;
  onClose: () => void;
  onSubmit: (payload: ReportEditSubmitPayload) => Promise<void>;
  onDelete?: () => Promise<void>;
};

function resolveMediaUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/")) return `${API_BASE_URL}${path}`;
  return `${API_BASE_URL}/${path}`;
}

export default function ReportEditModal({
  isOpen,
  busy,
  error,
  report,
  onClose,
  onSubmit,
  onDelete,
}: ReportEditModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"danger" | "help" | "warning" | "healthy">("warning");
  const [area, setArea] = useState("");
  const [location, setLocation] = useState("");
  const [imageSlots, setImageSlots] = useState<ReportModalImageSlot[]>([]);
  const [hiddenBrokenUrls, setHiddenBrokenUrls] = useState<Set<string>>(new Set());

  function releasePreviewUrls(slots: ReportModalImageSlot[]) {
    slots.forEach((slot) => {
      if (slot.kind === "new") {
        URL.revokeObjectURL(slot.previewUrl);
      }
    });
  }

  function replaceImageAt(index: number, file: File) {
    setImageSlots((previous) => {
      if (index < 0 || index >= previous.length) return previous;
      const current = previous[index];
      if (current.kind === "new") {
        URL.revokeObjectURL(current.previewUrl);
      }

      const next = [...previous];
      next[index] = { kind: "new", file, previewUrl: URL.createObjectURL(file) };
      return next;
    });
  }

  function removeImageAt(index: number) {
    setImageSlots((previous) => {
      if (index < 0 || index >= previous.length) return previous;
      const current = previous[index];
      if (current.kind === "new") {
        URL.revokeObjectURL(current.previewUrl);
      }
      return previous.filter((_, slotIndex) => slotIndex !== index);
    });
  }

  function addImage(file: File) {
    setImageSlots((previous) => {
      if (previous.length >= 3) return previous;
      return [...previous, { kind: "new", file, previewUrl: URL.createObjectURL(file) }];
    });
  }

  useEffect(() => {
    if (!isOpen || !report) return;

    setTitle(report.title);
    setDescription(report.description);
    setCategory(report.category);
    setArea(report.area);
    setLocation(report.location);
    setHiddenBrokenUrls(new Set());

    const sortedItems = (report.image_items || [])
      .slice()
      .sort((a: ReportImageItem, b: ReportImageItem) => a.order - b.order)
      .map((item) => ({ kind: "existing" as const, id: item.id, url: resolveMediaUrl(item.url) }));

    setImageSlots((previous) => {
      releasePreviewUrls(previous);
      return sortedItems;
    });
  }, [isOpen, report]);

  useEffect(() => {
    return () => {
      releasePreviewUrls(imageSlots);
    };
    // Intentionally run cleanup only on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isOpen || !report) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section className="relative w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 sm:p-8">
        <header className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Edit Report</h2>
          <button
            type="button"
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            onClick={onClose}
            disabled={busy}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        {error ? (
          <p className="mb-5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {error}
          </p>
        ) : null}

        <form
          className="flex flex-col gap-4"
          onSubmit={async (event) => {
            event.preventDefault();

            const image_slots: ReportImageSlot[] = [];
            const files: File[] = [];

            imageSlots.forEach((slot) => {
              if (slot.kind === "existing") {
                image_slots.push({ kind: "existing", id: slot.id });
              } else {
                image_slots.push({ kind: "new" });
                files.push(slot.file);
              }
            });

            await onSubmit({
              title,
              description,
              category,
              area,
              location,
              image_slots,
              files,
            });
          }}
        >
          <input className="block w-full rounded-xl border border-slate-300 px-4 py-2.5" value={title} onChange={(event) => setTitle(event.target.value)} required />
          <textarea className="block w-full rounded-xl border border-slate-300 px-4 py-2.5" value={description} onChange={(event) => setDescription(event.target.value)} required />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <select
              className="block w-full rounded-xl border border-slate-300 px-4 py-2.5"
              value={category}
              onChange={(event) => setCategory(event.target.value as "danger" | "help" | "warning" | "healthy")}
            >
              <option value="danger">Danger</option>
              <option value="help">Help</option>
              <option value="warning">Warning</option>
              <option value="healthy">Healthy</option>
            </select>
            <input className="block w-full rounded-xl border border-slate-300 px-4 py-2.5" value={area} onChange={(event) => setArea(event.target.value)} required />
          </div>

          <input className="block w-full rounded-xl border border-slate-300 px-4 py-2.5" value={location} onChange={(event) => setLocation(event.target.value)} required />

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">Report Images (Order 1 to 3)</p>
              <span className="text-xs text-slate-500">{imageSlots.length}/3</span>
            </div>

            {imageSlots.length === 0 ? (
              <p className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">No images selected for this report.</p>
            ) : null}

            <div className="space-y-3">
              {imageSlots.map((slot, index) => {
                const source = slot.kind === "existing" ? slot.url : slot.previewUrl;
                const isHidden = hiddenBrokenUrls.has(source);

                return (
                  <div key={`${slot.kind}-${index}-${slot.kind === "existing" ? slot.id : slot.file.name}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Image {index + 1} {slot.kind === "existing" ? "(Current)" : "(New)"}</p>
                      <button type="button" className="text-xs font-semibold text-red-600" onClick={() => removeImageAt(index)} disabled={busy}>Remove</button>
                    </div>

                    {!isHidden ? (
                      <img
                        src={source}
                        alt={`Report image ${index + 1}`}
                        className="mb-3 h-32 w-full rounded-lg border border-slate-200 bg-white object-cover"
                        onError={() => {
                          setHiddenBrokenUrls((prev) => {
                            const next = new Set(prev);
                            next.add(source);
                            return next;
                          });
                        }}
                      />
                    ) : (
                      <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">Image file is missing on server. You can replace or remove this slot.</p>
                    )}

                    <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                      Replace image
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          replaceImageAt(index, file);
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                  </div>
                );
              })}
            </div>

            {imageSlots.length < 3 ? (
              <label className="mt-3 inline-flex cursor-pointer items-center rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100">
                Add image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    addImage(file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap justify-end gap-3">
            <button type="button" className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700" onClick={onClose} disabled={busy}>Cancel</button>
            {onDelete ? (
              <button type="button" className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white" onClick={onDelete} disabled={busy}>Delete Report</button>
            ) : null}
            <button type="submit" className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white" disabled={busy}>{busy ? "Saving..." : "Save Report"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
