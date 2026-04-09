"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
    <div className="grid h-full min-h-[400px] w-full place-items-center bg-slate-50 text-sm font-medium text-slate-500 animate-pulse">
      Initializing map instance...
    </div>
  ),
});

export function OpenStreetMapPanel() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRangeFilter, setDateRangeFilter] = useState<"7d" | "30d" | "90d" | "all">("7d");
  const [categoryFilter, setCategoryFilter] = useState<"all" | Report["category"]>("all");
  const [areaFilter, setAreaFilter] = useState("all");
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

  const availableAreas = useMemo(() => {
    return Array.from(new Set(reports.map((report) => report.area.trim()).filter(Boolean))).sort((left, right) =>
      left.localeCompare(right),
    );
  }, [reports]);

  const filteredReports = useMemo(() => {
    const now = Date.now();
    const maxAgeMs =
      dateRangeFilter === "7d"
        ? 7 * 24 * 60 * 60 * 1000
        : dateRangeFilter === "30d"
          ? 30 * 24 * 60 * 60 * 1000
          : dateRangeFilter === "90d"
            ? 90 * 24 * 60 * 60 * 1000
            : null;

    const normalizedAreaFilter = areaFilter.toLowerCase();

    return reports.filter((report) => {
      if (categoryFilter !== "all" && report.category !== categoryFilter) return false;
      if (areaFilter !== "all" && report.area.trim().toLowerCase() !== normalizedAreaFilter) return false;
      if (maxAgeMs !== null) {
        const createdAtMs = new Date(report.created_at).getTime();
        if (Number.isNaN(createdAtMs) || now - createdAtMs > maxAgeMs) return false;
      }
      return true;
    });
  }, [reports, dateRangeFilter, categoryFilter, areaFilter]);

  async function withAccessToken<T>(fn: (token: string) => Promise<T>) {
    const access = getAccessToken();
    const refresh = getRefreshToken();

    if (!access) throw new Error("Please log in first to submit a report.");

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
    <section className="mt-6 flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white/40 backdrop-blur-md shadow-xl shadow-slate-200/30">
      {/* Header & Filter Toolbar */}
      <div className="border-b border-slate-200/70 bg-white/22 p-5 md:p-6 backdrop-blur-sm">
        <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
              <p className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-500">Live Radar</p>
            </div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">City Reports</h2>
            <p className="mt-1 text-sm text-slate-500">
              Showing {filteredReports.length} of {reports.length} active records.
            </p>
          </div>

          <button
            onClick={() => {
              setDateRangeFilter("7d");
              setCategoryFilter("all");
              setAreaFilter("all");
            }}
            className="text-sm font-medium text-slate-500 transition-colors hover:text-cyan-700"
          >
            Clear Filters
          </button>
        </div>

        {error && (
          <div className="mb-5 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-semibold">{error}</p>
            <button
              onClick={loadReports}
              className="rounded-lg bg-white px-3 py-1.5 font-medium shadow-sm transition hover:bg-red-50"
            >
              Retry
            </button>
          </div>
        )}

        {/* Compact Filters */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <select
            value={dateRangeFilter}
            onChange={(e) => setDateRangeFilter(e.target.value as any)}
            className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none transition-all focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none transition-all focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
          >
            <option value="all">All Categories</option>
            <option value="danger">Danger</option>
            <option value="help">Help Needs</option>
            <option value="warning">Warnings</option>
            <option value="healthy">Healthy/Clear</option>
          </select>

          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none transition-all focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
          >
            <option value="all">All Areas</option>
            {availableAreas.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Map Area */}
      <div className="relative h-[60vh] min-h-[500px] w-full bg-slate-100">
        <OpenStreetMapView reports={filteredReports} onLocationPick={onMapPick} onEditReport={startEdit} />

        {/* Floating Centered Badges */}
        <div className="pointer-events-none absolute left-0 right-0 top-6 z-[600] flex justify-center">
          {loadingReports ? (
            <span className="rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-md">
              Syncing live data...
            </span>
          ) : !error && filteredReports.length === 0 ? (
            <span className="rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-md">
              No reports found in this area.
            </span>
          ) : null}
        </div>

        {/* Modern FAB */}
        <button
          onClick={startCreate}
          aria-label="Create report"
          className="absolute bottom-6 right-6 z-[650] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-cyan-600 to-emerald-600 text-3xl text-white shadow-lg shadow-cyan-600/30 transition-all hover:scale-105 hover:from-cyan-700 hover:to-emerald-700 active:scale-95"
        >
          +
        </button>
      </div>

      {/* Modernized Create Modal */}
      {isCreateModalOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[11000] grid place-items-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm transition-opacity"
              role="dialog"
              aria-modal="true"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget && !createSubmitting) setIsCreateModalOpen(false);
              }}
            >
              <section className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                  <h3 className="text-lg font-bold text-slate-900">Pin a new report</h3>
                  <button
                    onClick={() => setIsCreateModalOpen(false)}
                    disabled={createSubmitting}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200/50 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
                  >
                    ✕
                  </button>
                </header>

                <div className="p-6">
                  {createError && (
                    <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-600">
                      {createError}
                    </div>
                  )}

                  <form className="grid gap-4" onSubmit={onSubmitReport}>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                      placeholder="What's happening?"
                      value={form.title}
                      onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                      required
                    />

                    <textarea
                      className="min-h-[100px] w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                      placeholder="Add more details..."
                      value={form.description}
                      onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                      required
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <select
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                        value={form.category}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, category: e.target.value as any }))
                        }
                      >
                        <option value="danger">Danger</option>
                        <option value="help">Needs Help</option>
                        <option value="warning">Warning</option>
                        <option value="healthy">All Clear</option>
                      </select>

                      <input
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                        placeholder="Area Name"
                        value={form.area}
                        onChange={(e) => setForm((prev) => ({ ...prev, area: e.target.value }))}
                        required
                      />
                    </div>

                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 outline-none"
                      placeholder="Location Coordinates"
                      value={form.location}
                      onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                      readOnly
                      required
                    />

                    <div className="mt-2 grid grid-cols-3 gap-3">
                      {[0, 1, 2].map((idx) => (
                        <div key={idx} className="relative">
                          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-4 transition hover:border-cyan-400 hover:bg-cyan-50">
                            <span className="text-xs font-medium text-slate-500">Image {idx + 1}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => setFileAt(idx, e.target.files?.[0] || null)}
                            />
                          </label>
                        </div>
                      ))}
                    </div>

                    <button
                      type="submit"
                      disabled={createSubmitting}
                      className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:opacity-70"
                    >
                      {createSubmitting ? "Submitting..." : "Drop Pin"}
                    </button>
                  </form>
                </div>
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