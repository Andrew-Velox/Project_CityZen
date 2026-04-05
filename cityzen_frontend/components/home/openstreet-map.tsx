"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { getMyProfile, refreshAccessToken } from "@/lib/api/auth";
import { createReport, getReports, updateReport } from "@/lib/api/report";
import { ApiError, type Report } from "@/lib/api/types";
import { getAccessToken, getRefreshToken, setTokens } from "@/lib/auth/token-store";

const OpenStreetMapView = dynamic(() => import("@/components/home/openstreet-map-view"), {
  ssr: false,
  loading: () => <div className="map-loading">Loading map...</div>,
});

export function OpenStreetMapPanel() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mapPickNotice, setMapPickNotice] = useState<string | null>(null);
  const [awaitingMapPick, setAwaitingMapPick] = useState(false);
  const [showLocationOptions, setShowLocationOptions] = useState(true);
  const [locationMode, setLocationMode] = useState<"gps" | "map">("map");
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingReportId, setEditingReportId] = useState<number | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<[number, number] | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "warning" as "danger" | "help" | "warning" | "healthy",
    area: "",
    location: "",
    file: null as File | null,
  });

  const labelClass = "mb-1.5 block text-sm font-semibold text-[#1a2437]";
  const inputClass =
    "block min-h-[46px] w-full rounded-xl border border-[#d0d9e8] bg-[#fafcff] px-3.5 py-2.5 text-[0.96rem] text-[#0f172a] outline-none transition focus:border-[#1f4fd7] focus:bg-[#ffffff] focus:shadow-[0_0_0_4px_#1f4fd724]";
  const primaryBtnClass =
    "inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-transparent bg-gradient-to-br from-[#1f4fd7] to-[#173ea8] px-4 py-2 font-semibold text-[#ffffff] transition hover:-translate-y-[1px] hover:shadow-[0_12px_22px_#12295a36] disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none";

  const selectedLocationText = useMemo(() => {
    if (awaitingMapPick) return "Click anywhere on map to choose location";
    if (!selectedPosition) return "Click on the map to choose report location";
    return `${selectedPosition[0].toFixed(6)}, ${selectedPosition[1].toFixed(6)}`;
  }, [selectedPosition, awaitingMapPick]);

  useEffect(() => {
    async function loadReports() {
      try {
        const data = await getReports();
        setReports(data);
      } catch {
        setReports([]);
      }
    }

    loadReports();
  }, []);

  useEffect(() => {
    async function loadCurrentUser() {
      const token = getAccessToken();
      if (!token) {
        setCurrentUsername(null);
        return;
      }

      try {
        const users = await getMyProfile(token);
        setCurrentUsername(users[0]?.username || null);
      } catch {
        setCurrentUsername(null);
      }
    }

    loadCurrentUser();
  }, []);

  async function withAccessToken<T>(fn: (token: string) => Promise<T>) {
    const access = getAccessToken();
    const refresh = getRefreshToken();

    if (!access) {
      throw new Error("Please log in before creating a report.");
    }

    try {
      return await fn(access);
    } catch (err) {
      const shouldTryRefresh =
        err instanceof ApiError && err.status === 401 && Boolean(refresh);

      if (!shouldTryRefresh) throw err;

      const refreshed = await refreshAccessToken(refresh as string);
      setTokens(refreshed.access, refresh as string);
      return fn(refreshed.access);
    }
  }

  function openModal() {
    setError(null);
    setSuccess(null);
    setMapPickNotice(null);
    setMode("create");
    setEditingReportId(null);
    setShowLocationOptions(true);
    setForm({ title: "", description: "", category: "warning", area: "", location: "", file: null });
    setIsModalOpen(true);
  }

  function closeModal() {
    if (submitting) return;
    setIsModalOpen(false);
  }

  function onMapPick(lat: number, lng: number) {
    const formatted = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    setSelectedPosition([lat, lng]);
    setForm((prev) => ({ ...prev, location: formatted }));
    setMapPickNotice(null);
    setAwaitingMapPick(false);
    setShowLocationOptions(mode === "create" ? false : true);
    setLocationMode("map");
    setIsModalOpen(true);
  }

  function onEditReport(report: Report) {
    setMode("edit");
    setEditingReportId(report.id);
    setError(null);
    setSuccess(null);
    setMapPickNotice(null);
    setShowLocationOptions(false);
    setForm({
      title: report.title,
      description: report.description,
      category: report.category,
      area: report.area,
      location: report.location,
      file: null,
    });

    const parts = report.location.split(",").map((part) => Number.parseFloat(part.trim()));
    if (parts.length === 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
      setSelectedPosition([parts[0], parts[1]]);
    }

    setIsModalOpen(true);
  }

  async function useGpsLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setLocating(true);
    setError(null);
    setLocationMode("gps");

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      setSelectedPosition([lat, lng]);
      setForm((prev) => ({ ...prev, location: `${lat.toFixed(6)}, ${lng.toFixed(6)}` }));
    } catch {
      setError("Unable to get GPS location. Please allow location access.");
    } finally {
      setLocating(false);
    }
  }

  function pickFromMap() {
    setLocationMode("map");
    setError(null);
    setAwaitingMapPick(true);
    setMapPickNotice("Map pick mode enabled. Click any point on the map.");
    setIsModalOpen(false);
  }

  async function onSubmitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.location) {
      setError("Please click on the map to select a location.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (mode === "edit" && editingReportId) {
        const updated = await withAccessToken((token) =>
          updateReport(
            editingReportId,
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

        setReports((prev) => prev.map((report) => (report.id === updated.id ? updated : report)));
        setSuccess("Report updated successfully.");
      } else {
        const created = await withAccessToken((token) =>
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

        setReports((prev) => [created, ...prev]);
        setSuccess("Report submitted successfully.");
      }

      setForm({ title: "", description: "", category: "warning", area: "", location: "", file: null });
      setSelectedPosition(null);
      setEditingReportId(null);
      setIsModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit report.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      className="relative z-[1] mt-3 flex min-h-0 flex-1 flex-col rounded-3xl border border-[#d3dbe8] bg-gradient-to-b from-[#ffffff] to-[#f8fafd] p-4 shadow-[0_24px_56px_#1428481f] md:p-5"
      aria-label="City map section"
    >
      <div>
        <p className="inline-block font-mono text-[0.78rem] tracking-[0.05em] text-[#56708d]">OpenStreetMap</p>
        <h2 className="mt-1 text-[clamp(1.28rem,1.4vw,1.6rem)] font-bold tracking-[0.005em] text-[#0f172a]">Live city map</h2>
        <p className="mt-1 text-[0.96rem] text-[#55627a]">Click the map to pick a location, then use the + button to submit a report.</p>

        {success ? (
          <p className="mt-3 rounded-xl border border-[#b9e5d0] bg-[#edf9f3] px-3 py-2 font-semibold text-[#167a52]">
            Your report has been submitted successfully.
          </p>
        ) : null}
        {mapPickNotice ? (
          <p className="mt-3 rounded-xl border border-[#b9e5d0] bg-[#edf9f3] px-3 py-2 font-semibold text-[#167a52]">
            {mapPickNotice}
          </p>
        ) : null}
      </div>

      <div className="relative mt-2 h-[420px] md:h-[62vh] md:min-h-[520px]">
        <OpenStreetMapView
          selectedPosition={selectedPosition}
          onLocationPick={onMapPick}
          reports={reports}
          currentUsername={currentUsername}
          onEditReport={onEditReport}
        />

        <button
          type="button"
          className="absolute right-4 top-5 z-[450] grid h-[54px] w-[54px] place-items-center rounded-full border border-[#5677c0] bg-gradient-to-br from-[#244892] to-[#1a3470] text-[1.9rem] font-bold leading-none text-[#ffffff] shadow-[0_14px_28px_#1326494d] transition hover:-translate-y-[2px] hover:scale-[1.02] hover:shadow-[0_16px_30px_#1326495e]"
          onClick={openModal}
          aria-label="Create report"
        >
          <span>+</span>
        </button>

        <p className="absolute bottom-4 left-4 z-[420] rounded-xl border border-[#d1d9e7] bg-[#ffffffeb] px-3 py-2 text-[0.83rem] font-semibold text-[#2f3b50] shadow-[0_10px_20px_#13284c1c]">
          {selectedLocationText}
        </p>
      </div>

      {isModalOpen ? (
        <div
          className="fixed inset-0 z-[5000] grid place-items-center bg-[#111d356b] p-4 backdrop-blur-[3px]"
          role="dialog"
          aria-modal="true"
          aria-label="Create report modal"
        >
          <section className="relative z-[5001] w-full max-w-[620px] rounded-[20px] border border-[#d2dbe9] bg-gradient-to-b from-[#ffffff] to-[#f8fbff] p-4 shadow-[0_30px_64px_#12234533] md:p-5">
            <header className="mb-3 flex items-center justify-between gap-3">
              <h2>{mode === "edit" ? "Edit report" : "Create report"}</h2>
              <button
                type="button"
                className="inline-flex min-h-[38px] items-center justify-center rounded-xl border border-[#c7d3e6] bg-[#edf2fa] px-3 py-1.5 font-semibold text-[#2b456f]"
                onClick={closeModal}
                disabled={submitting}
              >
                Close
              </button>
            </header>

            {error ? <p className="mb-3 rounded-xl border border-[#f4c8c1] bg-[#fff2ef] px-3 py-2 font-semibold text-[#b9382c]">{error}</p> : null}

            <form className="grid gap-3.5" onSubmit={onSubmitReport}>
              <label htmlFor="report-title" className={labelClass}>Title</label>
              <input
                id="report-title"
                className={inputClass}
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                required
              />

              <label htmlFor="report-description" className={labelClass}>Description</label>
              <textarea
                id="report-description"
                className="block min-h-[110px] w-full resize-y rounded-xl border border-[#d0d9e8] bg-[#fafcff] px-3.5 py-2.5 text-[0.96rem] text-[#0f172a] outline-none transition focus:border-[#1f4fd7] focus:bg-[#ffffff] focus:shadow-[0_0_0_4px_#1f4fd724]"
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                required
              />

              <label htmlFor="report-category" className={labelClass}>Category</label>
              <select
                id="report-category"
                className={inputClass}
                value={form.category}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    category: event.target.value as "danger" | "help" | "warning" | "healthy",
                  }))
                }
                required
              >
                <option value="danger">Danger</option>
                <option value="help">Help</option>
                <option value="warning">Warning</option>
                <option value="healthy">Healthy</option>
              </select>

              <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                <div>
                  <label htmlFor="report-area" className={labelClass}>Area</label>
                  <input
                    id="report-area"
                    className={inputClass}
                    value={form.area}
                    onChange={(event) => setForm((prev) => ({ ...prev, area: event.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="report-location" className={labelClass}>Location</label>

                  {showLocationOptions ? (
                    <div className="mb-2 grid grid-cols-2 gap-2" role="group" aria-label="Choose location source">
                      <button
                        type="button"
                        className={`inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border px-2 py-2 font-bold transition ${locationMode === "gps" ? "border-[#9eb0ce] bg-gradient-to-b from-[#e7edf8] to-[#dde6f4] text-[#213a66]" : "border-[#cdd6e6] bg-gradient-to-b from-[#f7f9fd] to-[#edf2fa] text-[#2e456f] hover:-translate-y-[1px] hover:bg-gradient-to-b hover:from-[#eef3fa] hover:to-[#e5ecf8]"}`}
                        onClick={useGpsLocation}
                        disabled={locating || submitting}
                      >
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M12 4v3M12 17v3M4 12h3M17 12h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                          <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.8" />
                          <circle cx="12" cy="12" r="1.8" fill="currentColor" />
                        </svg>
                        {locating ? "Locating..." : "GPS Location"}
                      </button>

                      <button
                        type="button"
                        className={`inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border px-2 py-2 font-bold transition ${locationMode === "map" ? "border-[#9eb0ce] bg-gradient-to-b from-[#e7edf8] to-[#dde6f4] text-[#213a66]" : "border-[#cdd6e6] bg-gradient-to-b from-[#f7f9fd] to-[#edf2fa] text-[#2e456f] hover:-translate-y-[1px] hover:bg-gradient-to-b hover:from-[#eef3fa] hover:to-[#e5ecf8]"}`}
                        onClick={pickFromMap}
                        disabled={submitting}
                      >
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M12 21s6-5.8 6-10a6 6 0 10-12 0c0 4.2 6 10 6 10z" stroke="currentColor" strokeWidth="1.8" />
                          <circle cx="12" cy="11" r="2.2" fill="currentColor" />
                        </svg>
                        Pick From Map
                      </button>
                    </div>
                  ) : (
                    <p className="mb-2 rounded-xl border border-[#cdd8ea] bg-gradient-to-b from-[#f5f8fd] to-[#edf2fa] px-3 py-2 text-[0.88rem] font-semibold text-[#27406b]">
                      Location selected from map point.
                    </p>
                  )}

                  <input
                    id="report-location"
                    className={inputClass}
                    value={form.location}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, location: event.target.value }))
                    }
                    placeholder="GPS or map coordinates"
                    required
                  />
                </div>
              </div>

              <label htmlFor="report-file" className={labelClass}>Attachment (optional)</label>
              <input
                id="report-file"
                type="file"
                className={inputClass}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, file: event.target.files?.[0] || null }))
                }
              />

              <button type="submit" className={primaryBtnClass} disabled={submitting}>
                {submitting ? (mode === "edit" ? "Updating..." : "Submitting...") : (mode === "edit" ? "Update report" : "Submit report")}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
}
