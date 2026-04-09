"use client";

import { useMemo } from "react";
import type { Report } from "@/lib/api/types";

type ReportListPanelProps = {
  reports: Report[];
  loading: boolean;
  error: string | null;
  onReportClick?: (report: Report) => void;
};

function formatDate(dateString: string) {
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return dateString;
  
  // Cleaner, more modern date formatting (e.g., "Apr 9, 2:30 PM")
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).format(parsed);
}

function categoryClass(category: Report["category"]) {
  if (category === "danger") return "bg-red-50 text-red-700 ring-red-600/20";
  if (category === "help") return "bg-blue-50 text-blue-700 ring-blue-600/20";
  if (category === "warning") return "bg-amber-50 text-amber-700 ring-amber-600/20";
  return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
}

function getStatusColor(status: string) {
  const s = status.toLowerCase();
  if (s.includes("resolved") || s.includes("closed")) return "bg-emerald-500 shadow-emerald-500/40";
  if (s.includes("progress") || s.includes("active")) return "bg-blue-500 shadow-blue-500/40";
  return "bg-slate-400 shadow-slate-400/40";
}

export default function ReportListPanel({ reports, loading, error, onReportClick }: ReportListPanelProps) {
  const sortedReports = useMemo(() => {
    return [...reports].sort((left, right) => {
      const leftTime = new Date(left.created_at).getTime();
      const rightTime = new Date(right.created_at).getTime();
      const safeLeft = Number.isNaN(leftTime) ? 0 : leftTime;
      const safeRight = Number.isNaN(rightTime) ? 0 : rightTime;
      return safeRight - safeLeft;
    });
  }, [reports]);

  return (
    <section className="flex flex-col border-t border-slate-200/80 bg-slate-50/50 p-5 md:p-6">
      {/* Header */}
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
            </span>
            <p className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-500">
              লাইভ ফিড
            </p>
          </div>
          <h3 className="mt-1.5 text-xl font-bold tracking-tight text-slate-900">
            সাম্প্রতিক কার্যক্রম
          </h3>
        </div>
        <span className="flex h-7 items-center justify-center rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 shadow-sm">
          {sortedReports.length} টি রিপোর্ট
        </span>
      </div>

      {/* Content Area */}
      <div className="relative flex-1">
        {loading ? (
          /* Premium Skeleton Loader */
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-3 flex justify-between">
                  <div className="h-5 w-1/2 rounded-md bg-slate-200"></div>
                  <div className="h-5 w-16 rounded-full bg-slate-100"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-full rounded bg-slate-100"></div>
                  <div className="h-3 w-4/5 rounded bg-slate-100"></div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          /* Error State */
          <div className="flex flex-col items-center justify-center rounded-2xl border border-red-100 bg-red-50 py-10 text-center">
            <span className="mb-2 text-2xl">⚠️</span>
            <h4 className="text-sm font-semibold text-red-800">ফিড লোড করা যায়নি</h4>
            <p className="mt-1 text-xs text-red-600">{error}</p>
          </div>
        ) : sortedReports.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center shadow-sm">
            <svg className="mb-3 h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h4 className="text-sm font-semibold text-slate-700">এখনও কোনো রিপোর্ট নেই</h4>
            <p className="mt-1 text-xs text-slate-500">এই এলাকার কার্যক্রম এখানে দেখা যাবে।</p>
          </div>
        ) : (
          /* Scrollable List */
          <div className="max-h-[420px] space-y-4 overflow-y-auto pr-2 pb-4 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5">
            {sortedReports.map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => onReportClick?.(report)}
                className="group relative flex w-full flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-base font-bold leading-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                      {report.title}
                    </h4>
                    <p className="mt-1.5 text-xs font-medium text-slate-500">
                      {report.author} • {formatDate(report.created_at)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 inline-flex items-center rounded-md px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ring-1 ring-inset ${categoryClass(report.category)}`}
                  >
                    {report.category}
                  </span>
                </div>

                {/* Card Body */}
                <p className="line-clamp-2 text-sm leading-relaxed text-slate-600">
                  {report.description}
                </p>

                {/* Card Footer (Metadata) */}
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-50 pt-3 text-xs font-medium text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="truncate max-w-[120px]">{report.area}</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full shadow-sm ${getStatusColor(report.status)}`}></span>
                    <span className="capitalize">{report.status.replace("_", " ")}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}