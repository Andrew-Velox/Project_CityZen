"use client";

import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { refreshAccessToken } from "@/lib/api/auth";
import { createReport, deleteReport, getReports, updateReport } from "@/lib/api/report";
import { getAccessToken, getRefreshToken, setTokens } from "@/lib/auth/token-store";
import { ApiError, type Report } from "@/lib/api/types";
import ReportEditModal, { type ReportEditSubmitPayload } from "@/components/report/report-edit-modal";

const OpenStreetMapView = dynamic(() => import("@/components/home/openstreet-map-view"), {
  ssr: false,
  loading: () => (
    <div className="mt-2 grid h-full min-h-0 place-items-center rounded-2xl border border-[#d7e2ff] bg-[linear-gradient(145deg,#f6f9ff_0%,#eef4ff_100%)] font-semibold text-[#334155]">
      Loading map...
    </div>
  ),
});

export function OpenStreetMapPanel() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "warning" as "danger" | "help" | "warning" | "healthy",
    area: "",
    location: "",
    files: [] as File[],
  });

  function setFileAt(index: number, file: File | null) {
    setForm((prev) => {
      const nextFiles: (File | null)[] = [null, null, null];

      prev.files.slice(0, 3).forEach((existing, existingIndex) => {
        nextFiles[existingIndex] = existing;
      });

      nextFiles[index] = file;

      return {
        ...prev,
        files: nextFiles.filter((item): item is File => Boolean(item)),
      };
    });
  }

  async function loadReports() {
    setLoadingReports(true);
    setError(null);

    try {
      const data = await getReports();
      setReports(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load reports for map.";
      setError(message);
    } finally {
      setLoadingReports(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  async function withAccessToken<T>(fn: (token: string) => Promise<T>) {
    const access = getAccessToken();
    const refresh = getRefreshToken();

    if (!access) {
      throw new Error("Please log in first to submit a report.");
    }

    try {
      return await fn(access);
    } catch (err) {
      const canRefresh = err instanceof ApiError && err.status === 401 && Boolean(refresh);
      if (!canRefresh) throw err;

      const refreshed = await refreshAccessToken(refresh as string);
      setTokens(refreshed.access, refresh as string);
      return fn(refreshed.access);
    }
  }

  function resetForm() {
    setForm({
      title: "",
      description: "",
      category: "warning",
      area: "",
      location: "",
      files: [],
    });
  }

  function startCreate() {
    setCreateError(null);
    resetForm();
    setIsCreateModalOpen(true);
  }

  function startEdit(report: Report) {
    setEditError(null);
    setEditingReport(report);
  }

  function onMapPick(lat: number, lng: number) {
    setCreateError(null);
    setForm((prev) => ({
      ...prev,
      location: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    }));
    setIsCreateModalOpen(true);
  }

  async function onSubmitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateSubmitting(true);
    setCreateError(null);

    try {
      await withAccessToken((token) =>
        createReport(
          {
            title: form.title,
            description: form.description,
            category: form.category,
            area: form.area,
            location: form.location,
            files: form.files,
          },
          token,
        ),
      );

      setIsCreateModalOpen(false);
      resetForm();
      await loadReports();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to submit report.");
    } finally {
      setCreateSubmitting(false);
    }
  }

  async function onEditSubmit(payload: ReportEditSubmitPayload) {
    if (!editingReport) return;

    setEditSubmitting(true);
    setEditError(null);

    try {
      await withAccessToken((token) =>
        updateReport(
          editingReport.id,
          {
            title: payload.title,
            description: payload.description,
            category: payload.category,
            area: payload.area,
            location: payload.location,
            files: payload.files,
            image_slots: payload.image_slots,
          },
          token,
        ),
      );

      setEditingReport(null);
      await loadReports();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update report.");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function onEditDelete() {
    if (!editingReport) return;

    setEditSubmitting(true);
    setEditError(null);

    try {
      await withAccessToken((token) => deleteReport(editingReport.id, token));
      setEditingReport(null);
      await loadReports();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to delete report.");
    } finally {
      setEditSubmitting(false);
    }
  }

  return (
    <section
      className="relative mt-3 flex min-h-0 flex-1 flex-col rounded-3xl border border-[#d3dbe8] bg-gradient-to-b from-[#ffffff] to-[#f8fafd] p-3 shadow-[0_24px_56px_#1428481f] md:p-5"
      aria-label="City map section"
    >
      <div>
        <p className="inline-block font-mono text-[0.78rem] tracking-[0.05em] text-[#56708d]">OpenStreetMap</p>
        <h2 className="mt-1 text-[clamp(1.28rem,1.4vw,1.6rem)] font-bold tracking-[0.005em] text-[#0f172a]">Live city map</h2>
        <p className="mt-1 text-[0.96rem] text-[#55627a]">Showing submitted reports on the map. Use + to add a report.</p>
        {error ? (
          <div className="mt-3 rounded-xl border border-[#f4c8c1] bg-[#fff2ef] px-3 py-2 text-[#b9382c]">
            <p className="font-semibold">{error}</p>
            <button
              type="button"
              className="mt-2 rounded-lg border border-[#e2b2ab] bg-[#fff7f5] px-2.5 py-1 text-[0.8rem] font-semibold text-[#8f3328]"
              onClick={loadReports}
            >
              Retry loading reports
            </button>
          </div>
        ) : null}
      </div>

      <div className="relative mt-2 h-[clamp(360px,62vh,820px)] sm:h-[clamp(420px,66vh,820px)]">
        <OpenStreetMapView reports={reports} onLocationPick={onMapPick} onEditReport={startEdit} />
        {loadingReports ? (
          <p className="pointer-events-none absolute left-3 top-3 z-[600] rounded-xl border border-[#cfd9ea] bg-[#ffffffeb] px-2.5 py-1.5 text-[0.78rem] font-semibold text-[#304a72] shadow-[0_10px_24px_#12284d1a] sm:left-4 sm:top-4 sm:px-3 sm:py-2 sm:text-[0.82rem]">
            Loading reports...
          </p>
        ) : null}

        <button
          type="button"
          className="absolute bottom-4 right-3 z-[650] grid h-12 w-12 place-items-center rounded-full border border-[#5677c0] bg-gradient-to-br from-[#244892] to-[#1a3470] text-[1.6rem] font-bold leading-none text-[#ffffff] shadow-[0_14px_28px_#1326494d] sm:bottom-5 sm:right-4 sm:h-[54px] sm:w-[54px] sm:text-[1.9rem]"
          onClick={startCreate}
          aria-label="Create report"
        >
          <span>+</span>
        </button>
      </div>

      {isCreateModalOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[11000] grid place-items-center overflow-x-hidden bg-[#111d356b] p-3 backdrop-blur-[3px] sm:p-4"
              role="dialog"
              aria-modal="true"
              aria-label="Create report"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget && !createSubmitting) {
                  setIsCreateModalOpen(false);
                }
              }}
            >
              <section className="w-[min(94vw,560px)] max-h-[92dvh] overflow-x-hidden overflow-y-auto rounded-[20px] border border-[#d2dbe9] bg-[#ffffff] p-3 shadow-[0_30px_64px_#12234533] sm:p-4 md:p-5">
                <header className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-[1rem] font-bold text-[#0f172a] sm:text-[1.1rem]">Create report</h3>
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#c7d3e6] bg-[#edf2fa] text-[1.2rem] font-bold leading-none text-[#2b456f]"
                    onClick={() => setIsCreateModalOpen(false)}
                    disabled={createSubmitting}
                    aria-label="Close modal"
                  >
                    ×
                  </button>
                </header>

                {createError ? (
                  <p className="mb-3 rounded-xl border border-[#f4c8c1] bg-[#fff2ef] px-3 py-2 text-sm font-semibold text-[#b9382c]">
                    {createError}
                  </p>
                ) : null}

                <form className="grid gap-3" onSubmit={onSubmitReport}>
                  <input
                    className="w-full rounded-xl border border-[#d0d9e8] bg-[#fafcff] px-3 py-2.5 text-[0.92rem] sm:px-3.5 sm:text-[0.96rem]"
                    placeholder="Title"
                    value={form.title}
                    onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                    required
                  />

                  <textarea
                    className="min-h-[95px] w-full rounded-xl border border-[#d0d9e8] bg-[#fafcff] px-3 py-2.5 text-[0.92rem] sm:px-3.5 sm:text-[0.96rem]"
                    placeholder="Description"
                    value={form.description}
                    onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                    required
                  />

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <select
                      className="w-full rounded-xl border border-[#d0d9e8] bg-[#fafcff] px-3 py-2.5 text-[0.92rem] sm:px-3.5 sm:text-[0.96rem]"
                      value={form.category}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          category: event.target.value as "danger" | "help" | "warning" | "healthy",
                        }))
                      }
                    >
                      <option value="danger">Danger</option>
                      <option value="help">Help</option>
                      <option value="warning">Warning</option>
                      <option value="healthy">Healthy</option>
                    </select>

                    <input
                      className="w-full rounded-xl border border-[#d0d9e8] bg-[#fafcff] px-3 py-2.5 text-[0.92rem] sm:px-3.5 sm:text-[0.96rem]"
                      placeholder="Area"
                      value={form.area}
                      onChange={(event) => setForm((prev) => ({ ...prev, area: event.target.value }))}
                      required
                    />
                  </div>

                  <input
                    className="w-full rounded-xl border border-[#d0d9e8] bg-[#fafcff] px-3 py-2.5 text-[0.92rem] sm:px-3.5 sm:text-[0.96rem]"
                    placeholder="Location: lat, lng (example: 23.8103, 90.4125)"
                    value={form.location}
                    onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
                    required
                  />

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-[0.78rem] font-semibold text-[#475569]">Image 1</label>
                      <input
                        type="file"
                        accept="image/*"
                        className="w-full rounded-xl border border-[#d0d9e8] bg-[#fafcff] px-2.5 py-2 text-[0.86rem]"
                        onChange={(event) => setFileAt(0, event.target.files?.[0] || null)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[0.78rem] font-semibold text-[#475569]">Image 2</label>
                      <input
                        type="file"
                        accept="image/*"
                        className="w-full rounded-xl border border-[#d0d9e8] bg-[#fafcff] px-2.5 py-2 text-[0.86rem]"
                        onChange={(event) => setFileAt(1, event.target.files?.[0] || null)}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[0.78rem] font-semibold text-[#475569]">Image 3</label>
                      <input
                        type="file"
                        accept="image/*"
                        className="w-full rounded-xl border border-[#d0d9e8] bg-[#fafcff] px-2.5 py-2 text-[0.86rem]"
                        onChange={(event) => setFileAt(2, event.target.files?.[0] || null)}
                      />
                    </div>
                  </div>
                  <p className="text-[0.78rem] text-[#64748b]">Upload up to 3 images (one per field).</p>

                  <button
                    type="submit"
                    className="rounded-xl bg-[#1f4fd7] px-4 py-2.5 font-semibold text-[#ffffff] disabled:opacity-70"
                    disabled={createSubmitting}
                  >
                    {createSubmitting ? "Submitting..." : "Submit report"}
                  </button>
                </form>
              </section>
            </div>,
            document.body,
          )
        : null}

      <ReportEditModal
        isOpen={Boolean(editingReport)}
        busy={editSubmitting}
        error={editError}
        report={editingReport}
        onClose={() => {
          if (!editSubmitting) {
            setEditingReport(null);
            setEditError(null);
          }
        }}
        onSubmit={onEditSubmit}
        onDelete={onEditDelete}
      />
    </section>
  );
}
