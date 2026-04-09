"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
    return () => releasePreviewUrls(imageSlots);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isOpen || !report || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[13000] grid place-items-center bg-slate-900/40 p-4 backdrop-blur-md transition-opacity"
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section className="relative flex w-full max-w-2xl max-h-[90vh] flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl ring-1 ring-slate-900/5 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Sticky Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4 sm:px-8">
          <div>
            <h2 className="text-lg font-bold text-slate-900">রিপোর্ট সম্পাদনা</h2>
            <p className="text-xs font-medium text-slate-500">তথ্য আপডেট করুন বা সংযুক্ত মিডিয়া পরিচালনা করুন।</p>
          </div>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200/50 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
            onClick={onClose}
            disabled={busy}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <form id="edit-report-form" className="flex flex-col gap-5" onSubmit={async (e) => {
            e.preventDefault();
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

            await onSubmit({ title, description, category, area, location, image_slots, files });
          }}>
            
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">রিপোর্ট শিরোনাম</label>
              <input 
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                required 
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">বিবরণ</label>
              <textarea 
                className="min-h-[100px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                required 
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">ক্যাটাগরি</label>
                <select
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                >
                  <option value="danger">বিপদ</option>
                  <option value="help">সহায়তা প্রয়োজন</option>
                  <option value="warning">সতর্কতা</option>
                  <option value="healthy">নিরাপদ</option>
                </select>
              </div>
              
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">এলাকা</label>
                <input 
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" 
                  value={area} 
                  onChange={(e) => setArea(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">লোকেশন কোঅর্ডিনেট</label>
              <input 
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-500 outline-none" 
                value={location} 
                onChange={(e) => setLocation(e.target.value)} 
                required 
                readOnly
              />
            </div>

            {/* Media Gallery Section */}
            <div className="pt-2">
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700">সংযুক্ত মিডিয়া</h3>
                  <p className="text-xs text-slate-500">এই রিপোর্টে সর্বোচ্চ ৩টি ছবি আপলোড করুন।</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {imageSlots.length} / 3
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {imageSlots.map((slot, index) => {
                  const source = slot.kind === "existing" ? slot.url : slot.previewUrl;
                  const isHidden = hiddenBrokenUrls.has(source);

                  return (
                    <div key={index} className="group relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                      {!isHidden ? (
                        <img
                          src={source}
                          alt={`Report media ${index + 1}`}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={() => {
                            setHiddenBrokenUrls((prev) => new Set(prev).add(source));
                          }}
                        />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                          <span className="text-2xl">⚠️</span>
                          <p className="mt-1 text-[10px] font-medium text-slate-500">ছবি পাওয়া যায়নি</p>
                        </div>
                      )}

                      {/* Hover Overlay Controls */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/40 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100">
                        <label className="flex w-24 cursor-pointer items-center justify-center rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-white hover:scale-105 active:scale-95">
                          বদলান
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) replaceImageAt(index, file);
                              e.currentTarget.value = "";
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          className="flex w-24 items-center justify-center rounded-lg bg-red-500/90 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-red-500 hover:scale-105 active:scale-95"
                          onClick={() => removeImageAt(index)}
                          disabled={busy}
                        >
                          সরান
                        </button>
                      </div>
                      
                      {/* Badge indicator for new vs existing */}
                      {slot.kind === "new" && (
                        <span className="absolute left-2 top-2 rounded-md bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white shadow-sm">
                          নতুন
                        </span>
                      )}
                    </div>
                  );
                })}

                {/* Add Image Dropzone */}
                {imageSlots.length < 3 && (
                  <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-500">
                    <svg className="mb-2 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-xs font-semibold">ছবি যোগ করুন</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) addImage(file);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Sticky Footer */}
        <footer className="flex shrink-0 items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-4 sm:px-8">
          <div>
            {onDelete && (
              <button 
                type="button" 
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50" 
                onClick={onDelete} 
                disabled={busy}
              >
                রিপোর্ট মুছুন
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button 
              type="button" 
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-200/50" 
              onClick={onClose} 
              disabled={busy}
            >
              বাতিল
            </button>
            <button 
              type="submit" 
              form="edit-report-form"
              className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-70" 
              disabled={busy}
            >
              {busy ? "সংরক্ষণ হচ্ছে..." : "পরিবর্তন সংরক্ষণ করুন"}
            </button>
          </div>
        </footer>

      </section>
    </div>,
    document.body,
  );
}