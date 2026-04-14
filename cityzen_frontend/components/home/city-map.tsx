"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { refreshAccessToken } from "@/lib/api/auth";
import { createReport, deleteReport, getReports, updateReport } from "@/lib/api/report";
import { getAccessToken, getRefreshToken, setTokens } from "@/lib/auth/token-store";
import { ApiError, type Report } from "@/lib/api/types";
import ReportEditModal, { type ReportEditSubmitPayload } from "@/components/report/report-edit-modal";

const CityMapView = dynamic(() => import("@/components/home/city-map-view"), {
  ssr: false,
  loading: () => (
    <div className="grid h-[100dvh] w-full place-items-center bg-slate-50 text-sm font-medium text-cyan-600 animate-pulse">
      Initializing Map...
    </div>
  ),
});

export function CityMapPanel() {
  const [reports, setReports] = useState<Report[]>([]);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  
  // States
  const [loadingReports, setLoadingReports] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [focusLocation, setFocusLocation] = useState<string | null>(null);
  const [focusRequestKey, setFocusRequestKey] = useState(0);

  // Filters
  const [dateRangeFilter, setDateRangeFilter] = useState<"7d" | "30d" | "90d" | "all">("7d");
  const [categoryFilter, setCategoryFilter] = useState<"all" | Report["category"]>("all");
  const [areaFilter, setAreaFilter] = useState("all");

  // Form State
  const [form, setForm] = useState({
    title: "", description: "", category: "warning" as Report["category"], area: "", location: "", files: [] as File[],
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  // --- Utility Functions ---

  const setFileAt = (index: number, file: File | null) => {
    setForm((prev) => {
      const nextFiles = [...prev.files];
      if (file) nextFiles[index] = file;
      else nextFiles.splice(index, 1);
      return { ...prev, files: nextFiles.filter(Boolean) };
    });
  };

  const resetForm = () => {
    setForm({ title: "", description: "", category: "warning", area: "", location: "", files: [] });
    setCreateError(null);
  };

  // --- Data Fetching ---

  const loadReports = async () => {
    setLoadingReports(true);
    setError(null);
    try {
      const data = await getReports();
      setReports(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports.");
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => { loadReports(); }, []);

  // --- Derived Data ---

  const availableAreas = useMemo(() => 
    Array.from(new Set(reports.map((r) => r.area.trim()).filter(Boolean))).sort(),
  [reports]);

  const filteredReports = useMemo(() => {
    const now = Date.now();
    const ages = { "7d": 7, "30d": 30, "90d": 90, "all": null };
    const maxAgeMs = ages[dateRangeFilter] ? ages[dateRangeFilter]! * 86400000 : null;

    return reports.filter((report) => {
      if (categoryFilter !== "all" && report.category !== categoryFilter) return false;
      if (areaFilter !== "all" && report.area.trim().toLowerCase() !== areaFilter.toLowerCase()) return false;
      if (maxAgeMs !== null) {
        const createdAtMs = new Date(report.created_at).getTime();
        if (now - createdAtMs > maxAgeMs) return false;
      }
      return true;
    });
  }, [reports, dateRangeFilter, categoryFilter, areaFilter]);

  // --- Handlers ---

  const withAccessToken = async <T,>(fn: (token: string) => Promise<T>) => {
    const access = getAccessToken();
    const refresh = getRefreshToken();
    if (!access) throw new Error("Authentication required.");

    try {
      return await fn(access);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401 && refresh) {
        const refreshed = await refreshAccessToken(refresh);
        setTokens(refreshed.access, refresh);
        return fn(refreshed.access);
      }
      throw err;
    }
  };

  const onSubmitReport = async (e: FormEvent) => {
    e.preventDefault();
    setCreateSubmitting(true);
    setCreateError(null);
    try {
      await withAccessToken((token) => createReport(form, token));
      setIsCreateModalOpen(false);
      resetForm();
      loadReports();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const onEditSubmit = async (payload: ReportEditSubmitPayload) => {
    if (!editingReport) return;
    setEditSubmitting(true);
    try {
      await withAccessToken((token) => updateReport(editingReport.id, payload, token));
      setEditingReport(null);
      loadReports();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setEditSubmitting(false);
    }
  };

  // --- Render Blocks ---

  const renderListPanel = () => {
    if (viewMode !== "list") return null;
    return (
      <div className="absolute bottom-28 left-1/2 z-[642] mx-auto w-11/12 max-w-lg -translate-x-1/2 rounded-[2rem] border border-white/60 bg-white/70 p-6 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.1)] backdrop-blur-2xl transition-all animate-in slide-in-from-bottom-4 fade-in duration-300">
        
        {/* Header with Close Button */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-extrabold tracking-wide text-slate-800">System Logs</h3>
            <span className="flex items-center gap-1.5 rounded-full bg-cyan-50/80 px-2.5 py-1 text-[10px] font-bold tracking-wider text-cyan-600 border border-cyan-200/50 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
              {filteredReports.length} Records
            </span>
          </div>
          <button 
            onClick={() => setViewMode("map")}
            className="grid h-8 w-8 place-items-center rounded-full bg-slate-100/60 text-slate-400 transition-all hover:bg-slate-200/80 hover:text-slate-700 active:scale-95"
            aria-label="Close list view"
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 1L1 13M1 1l12 12"/>
            </svg>
          </button>
        </div>

        {/* Premium Pill Filters */}
        <div className="mb-5 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <select 
            value={dateRangeFilter} 
            onChange={(e) => setDateRangeFilter(e.target.value as any)} 
            className="min-w-[100px] cursor-pointer appearance-none rounded-xl border border-slate-200/60 bg-white/50 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm outline-none backdrop-blur-md transition-all hover:bg-white hover:shadow focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/10"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>
          <select 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value as any)} 
            className="min-w-[110px] cursor-pointer appearance-none rounded-xl border border-slate-200/60 bg-white/50 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm outline-none backdrop-blur-md transition-all hover:bg-white hover:shadow focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/10"
          >
            <option value="all">All Types</option>
            <option value="danger">Danger</option>
            <option value="warning">Warning</option>
            <option value="help">Help</option>
            <option value="healthy">Healthy</option>
          </select>
          <select 
            value={areaFilter} 
            onChange={(e) => setAreaFilter(e.target.value)} 
            className="min-w-[110px] cursor-pointer appearance-none rounded-xl border border-slate-200/60 bg-white/50 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm outline-none backdrop-blur-md transition-all hover:bg-white hover:shadow focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/10"
          >
            <option value="all">All Sectors</option>
            {availableAreas.map((area) => <option key={area} value={area}>{area}</option>)}
          </select>
        </div>

        {/* Scrollable List Area */}
        <div className="max-h-[260px] space-y-2.5 overflow-y-auto pr-2 custom-scrollbar">
          {filteredReports.slice(0, 10).map((report) => (
            <button
              key={report.id}
              onClick={() => { setFocusLocation(report.location); setFocusRequestKey((p) => p + 1); setViewMode("map"); }}
              className="group relative flex w-full items-center justify-between rounded-2xl border border-white/40 bg-white/40 p-4 text-left shadow-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-200 hover:bg-white/80 hover:shadow-md"
            >
              <div className="min-w-0 pr-4">
                <p className="truncate text-sm font-bold text-slate-800 transition-colors group-hover:text-cyan-600">{report.title}</p>
                <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  {report.area || "Sector Unknown"}
                </p>
              </div>
              <span className={`shrink-0 rounded-xl px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest shadow-sm border ${
                report.category === 'danger' ? 'bg-red-50 text-red-600 border-red-100' :
                report.category === 'warning' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                'bg-cyan-50 text-cyan-600 border-cyan-100'
              }`}>
                {report.category}
              </span>
            </button>
          ))}
          
          {/* Empty State */}
          {filteredReports.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/30 py-10">
              <svg className="mb-2 h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <span className="text-xs font-semibold text-slate-400">No telemetry data found.</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderNavigation = () => {
  return (
    <div className="absolute bottom-6 left-1/2 z-[650] flex w-fit min-w-[260px] -translate-x-1/2 items-center justify-center gap-8 rounded-[2rem] border border-white/40 bg-white/60 px-6 py-2 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] backdrop-blur-2xl">
      
      {/* Logs Button */}
      <button
        type="button"
        onClick={() => setViewMode("list")}
        className="group relative flex flex-col items-center gap-1 transition-all"
      >
        <div className={`rounded-xl p-2 transition-all duration-300 ${
          viewMode === "list" 
          ? "bg-white/80 text-cyan-600 shadow-sm ring-1 ring-black/5" 
          : "text-slate-400 group-hover:text-slate-600 group-hover:bg-white/40"
        }`}>
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="9" y1="3" x2="9" y2="21"></line>
          </svg>
        </div>
        <span className={`text-[9px] font-bold uppercase tracking-[0.1em] transition-colors ${
          viewMode === "list" ? "text-cyan-600" : "text-slate-500"
        }`}>
          Logs
        </span>
      </button>

      {/* Floating Action Button (FAB) - Integrated closer */}
      <div className="relative h-12 w-12 shrink-0">
        <button
          onClick={() => { resetForm(); setIsCreateModalOpen(true); }}
          aria-label="Create new report"
          className="group absolute inset-0 flex items-center justify-center rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-[0_8px_16px_-4px_rgba(6,182,212,0.5)] transition-all duration-300 hover:scale-110 hover:shadow-[0_12px_20px_-4px_rgba(6,182,212,0.6)] active:scale-90"
        >
          <div className="absolute inset-0 rounded-full border-[2.5px] border-white/80" />
          <svg className="h-5 w-5 transition-transform duration-500 group-hover:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>

      {/* AI Agent Button */}
      <button
        type="button"
        className="group relative flex flex-col items-center gap-1 transition-all"
      >
        <div className="rounded-xl p-2 text-slate-400 transition-all duration-300 group-hover:bg-white/40 group-hover:text-slate-600">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 8V4H8"></path>
            <rect x="4" y="8" width="16" height="12" rx="2"></rect>
            <path d="M2 14h2"></path>
            <path d="M20 14h2"></path>
            <path d="M15 13v2"></path>
            <path d="M9 13v2"></path>
          </svg>
        </div>
        <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-500 group-hover:text-slate-700">
          Agent
        </span>
      </button>
      
    </div>
  );
};

  const renderCreateModal = () => {
    if (!isCreateModalOpen) return null;
    return createPortal(
      <div className="fixed inset-0 z-[11000] grid place-items-center bg-slate-900/40 p-4 backdrop-blur-md" onMouseDown={(e) => { if (e.target === e.currentTarget && !createSubmitting) setIsCreateModalOpen(false); }}>
        <section className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex justify-between items-center">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-800">Initialize Report</h3>
            <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>

          <div className="p-6">
            {createError && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-600">{createError}</div>}
            <form className="grid gap-4" onSubmit={onSubmitReport}>
              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
                placeholder="Incident Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required
              />
              <textarea
                className="min-h-[100px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-500/10 custom-scrollbar"
                placeholder="Provide detailed telemetry..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required
              />
              <div className="grid grid-cols-2 gap-3">
                <select className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-500/10" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as any })}>
                  <option value="danger">Critical</option>
                  <option value="help">Assist Req</option>
                  <option value="warning">Warning</option>
                  <option value="healthy">Stable</option>
                </select>
                <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-500/10" placeholder="Sector / Area" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} required />
              </div>

              <input className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-mono text-slate-500 outline-none" placeholder="Target Coordinates" value={form.location} readOnly />

              <div className="grid grid-cols-3 gap-3 pt-2">
                {Array.from({ length: 3 }).map((_, idx) => {
                  const file = form.files[idx];
                  const previewUrl = file ? URL.createObjectURL(file) : null;
                  return (
                    <label key={idx} className="group relative flex aspect-square cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 transition hover:border-cyan-400 hover:bg-cyan-50">
                      {previewUrl ? (
                        <>
                          <img src={previewUrl} alt={`Upload ${idx}`} className="h-full w-full object-cover" onLoad={() => URL.revokeObjectURL(previewUrl)} />
                          <div className="absolute inset-0 grid place-items-center bg-white/60 opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
                            <span className="text-[10px] font-bold text-slate-800 tracking-widest uppercase shadow-sm">Swap</span>
                          </div>
                        </>
                      ) : (
                        <span className="text-2xl text-slate-400 transition group-hover:text-cyan-500">+</span>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => setFileAt(idx, e.target.files?.[0] || null)} />
                    </label>
                  );
                })}
              </div>

              <button type="submit" disabled={createSubmitting} className="mt-2 w-full rounded-xl bg-cyan-600 px-4 py-3.5 text-sm font-bold uppercase tracking-widest text-white shadow-md shadow-cyan-500/20 transition hover:bg-cyan-500 disabled:opacity-50">
                {createSubmitting ? "Transmitting..." : "Upload Data"}
              </button>
            </form>
          </div>
        </section>
      </div>,
      document.body
    );
  };

  return (
    <section className="relative h-[100dvh] w-full overflow-hidden bg-slate-50 font-sans">
      <CityMapView
        reports={filteredReports}
        onLocationPick={(lat, lng) => {
          setForm(p => ({ ...p, location: `${lat.toFixed(6)}, ${lng.toFixed(6)}` }));
          setIsCreateModalOpen(true);
        }}
        onEditReport={(report) => { setEditError(null); setEditingReport(report); }}
        focusLocation={focusLocation}
        focusRequestKey={focusRequestKey}
      />

      {/* The dark vignette gradient overlay has been completely removed from here */}

      {/* Dynamic Status Badges */}
      <div className="pointer-events-none absolute left-0 right-0 top-40 z-[600] flex justify-center">
        {loadingReports ? (
           <span className="rounded-full border border-slate-200 bg-white/90 px-4 py-1.5 text-xs font-bold text-slate-600 backdrop-blur-md shadow-sm animate-pulse">Syncing Telemetry...</span>
        ) : error ? (
           <span className="rounded-full border border-red-200 bg-white/90 px-4 py-1.5 text-xs font-bold text-red-600 backdrop-blur-md shadow-sm">Error: {error}</span>
        ) : null}
      </div>

      {renderListPanel()}
      {renderNavigation()}
      {renderCreateModal()}

      <ReportEditModal
        isOpen={Boolean(editingReport)}
        busy={editSubmitting}
        error={editError}
        report={editingReport}
        onClose={() => !editSubmitting && setEditingReport(null)}
        onSubmit={onEditSubmit}
        onDelete={async () => {
          if (!editingReport) return;
          setEditSubmitting(true);
          try {
            await withAccessToken((token) => deleteReport(editingReport.id, token));
            setEditingReport(null);
            loadReports();
          } catch(err) {
            setEditError(err instanceof Error ? err.message : "Deletion failed");
          } finally {
            setEditSubmitting(false);
          }
        }}
      />
      
      <style dangerouslySetInnerHTML={{__html: `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
    </section>
  );
}