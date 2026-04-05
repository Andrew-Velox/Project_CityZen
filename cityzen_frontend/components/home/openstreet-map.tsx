"use client";

import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { refreshAccessToken } from "@/lib/api/auth";
import { createReport, getReports } from "@/lib/api/report";
import { getAccessToken, getRefreshToken, setTokens } from "@/lib/auth/token-store";
import { ApiError, type Report } from "@/lib/api/types";

const OpenStreetMapView = dynamic(() => import("@/components/home/openstreet-map-view"), {
  ssr: false,
  loading: () => <div className="map-loading">Loading map...</div>,
});

export function OpenStreetMapPanel() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "warning" as "danger" | "help" | "warning" | "healthy",
    area: "",
    location: "",
    file: null as File | null,
  });

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
      file: null,
    });
  }

  function onMapPick(lat: number, lng: number) {
    setSubmitError(null);
    setForm((prev) => ({
      ...prev,
      location: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    }));
    setIsModalOpen(true);
  }

  async function onSubmitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    try {
      await withAccessToken((token) =>
        createReport(
          {
            title: form.title,
            description: form.description,
            category: form.category,
            area: form.area,
            location: form.location,
            file: form.file,
          },
          token,
        ),
      );

      setIsModalOpen(false);
      resetForm();
      await loadReports();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit report.");
    } finally {
      setSubmitting(false);
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
        <OpenStreetMapView reports={reports} onLocationPick={onMapPick} />
        {loadingReports ? (
          <p className="pointer-events-none absolute left-3 top-3 z-[600] rounded-xl border border-[#cfd9ea] bg-[#ffffffeb] px-2.5 py-1.5 text-[0.78rem] font-semibold text-[#304a72] shadow-[0_10px_24px_#12284d1a] sm:left-4 sm:top-4 sm:px-3 sm:py-2 sm:text-[0.82rem]">
            Loading reports...
          </p>
        ) : null}

        <button
          type="button"
          className="absolute bottom-4 right-3 z-[650] grid h-12 w-12 place-items-center rounded-full border border-[#5677c0] bg-gradient-to-br from-[#244892] to-[#1a3470] text-[1.6rem] font-bold leading-none text-[#ffffff] shadow-[0_14px_28px_#1326494d] sm:bottom-5 sm:right-4 sm:h-[54px] sm:w-[54px] sm:text-[1.9rem]"
          onClick={() => {
            setSubmitError(null);
            setIsModalOpen(true);
          }}
          aria-label="Create report"
        >
          <span>+</span>
        </button>
      </div>

      {isModalOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[11000] grid place-items-center overflow-x-hidden bg-[#111d356b] p-3 backdrop-blur-[3px] sm:p-4"
              role="dialog"
              aria-modal="true"
              aria-label="Create report"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget && !submitting) {
                  setIsModalOpen(false);
                }
              }}
            >
              <section className="w-[min(94vw,560px)] max-h-[92dvh] overflow-x-hidden overflow-y-auto rounded-[20px] border border-[#d2dbe9] bg-[#ffffff] p-3 shadow-[0_30px_64px_#12234533] sm:p-4 md:p-5">
                <header className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-[1rem] font-bold text-[#0f172a] sm:text-[1.1rem]">Create report</h3>
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#c7d3e6] bg-[#edf2fa] text-[1.2rem] font-bold leading-none text-[#2b456f]"
                    onClick={() => setIsModalOpen(false)}
                    disabled={submitting}
                    aria-label="Close modal"
                  >
                    ×
                  </button>
                </header>

                {submitError ? (
                  <p className="mb-3 rounded-xl border border-[#f4c8c1] bg-[#fff2ef] px-3 py-2 text-sm font-semibold text-[#b9382c]">
                    {submitError}
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

                  <input
                    type="file"
                    className="w-full rounded-xl border border-[#d0d9e8] bg-[#fafcff] px-3.5 py-2.5 text-[0.92rem]"
                    onChange={(event) => setForm((prev) => ({ ...prev, file: event.target.files?.[0] || null }))}
                  />

                  <button
                    type="submit"
                    className="rounded-xl bg-[#1f4fd7] px-4 py-2.5 font-semibold text-[#ffffff] disabled:opacity-70"
                    disabled={submitting}
                  >
                    {submitting ? "Submitting..." : "Submit report"}
                  </button>
                </form>
              </section>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}
