"use client";

import { FormEvent, useEffect, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents, ZoomControl } from "react-leaflet";
import { API_BASE_URL } from "@/config/api";
import { createReportComment, getReportComments } from "@/lib/api/report";
import { getAccessToken } from "@/lib/auth/token-store";
import type { Report, ReportComment } from "@/lib/api/types";
import ReportViewModal from "@/components/report/report-view-modal";

const dhakaPosition: [number, number] = [23.8103, 90.4125];

function createCategoryIcon(category: Report["category"]) {
  const categoryMeta = {
    danger: { hex: "#ef4444", symbol: "!" },
    help: { hex: "#3b82f6", symbol: "?" },
    warning: { hex: "#f59e0b", symbol: "!" },
    healthy: { hex: "#10b981", symbol: "OK" },
  } as const;

  const meta = categoryMeta[category] || categoryMeta.warning;

  return L.divIcon({
    html: `
      <div style="position:relative;width:44px;height:52px;display:flex;align-items:flex-start;justify-content:center;">
        <span style="position:absolute;left:50%;top:4px;transform:translateX(-50%);width:34px;height:34px;border-radius:999px;background:${meta.hex};opacity:.25;filter:blur(6px);"></span>
        <div style="
          width:34px;
          height:34px;
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          background:${meta.hex};
          border:2px solid #ffffff;
          box-shadow:0 8px 14px #02061755;
          display:flex;
          align-items:center;
          justify-content:center;
        ">
          <span style="
            transform:rotate(45deg);
            color:#ffffff;
            font-size:${meta.symbol === "OK" ? "10px" : "13px"};
            font-weight:800;
            line-height:1;
            font-family:Inter,system-ui,-apple-system,sans-serif;
            letter-spacing:${meta.symbol === "OK" ? "0.02em" : "0"};
          ">${meta.symbol}</span>
        </div>
      </div>
    `,
    className: "bg-transparent border-none",
    iconSize: [44, 52],
    iconAnchor: [22, 50],
    popupAnchor: [0, -44],
  });
}

type OpenStreetMapViewProps = {
  reports: Report[];
  onLocationPick?: (lat: number, lng: number) => void;
  onEditReport?: (report: Report) => void;
};

function MapClickPicker({
  onPick,
  onMapClick,
}: {
  onPick?: (lat: number, lng: number) => void;
  onMapClick?: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(event) {
      onMapClick?.(event.latlng.lat, event.latlng.lng);
      if (!onPick) return;
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

function PopupCloseButton() {
  const map = useMap();
  return (
    <button
      type="button"
      onClick={() => map.closePopup()}
      aria-label="Close popup"
      className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

function parseLocation(location: string): [number, number] | null {
  const parts = location.split(",").map((part) => Number.parseFloat(part.trim()));
  if (parts.length !== 2) return null;
  if (Number.isNaN(parts[0]) || Number.isNaN(parts[1])) return null;
  return [parts[0], parts[1]];
}

export default function OpenStreetMapView({ reports, onLocationPick, onEditReport }: OpenStreetMapViewProps) {
  const [selectedPosition, setSelectedPosition] = useState<[number, number]>(dhakaPosition);
  const [detailsReport, setDetailsReport] = useState<Report | null>(null);
  const [comments, setComments] = useState<ReportComment[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  useEffect(() => {
    try {
      delete (L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: unknown })._getIconUrl;
    } catch {}

    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);

  function resolveFileUrl(file: string | null) {
    if (!file) return null;
    if (file.startsWith("http://") || file.startsWith("https://")) return file;
    if (file.startsWith("/")) return `${API_BASE_URL}${file}`;
    return `${API_BASE_URL}/${file}`;
  }

  function isImageFile(path: string | null) {
    if (!path) return false;
    return /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(path);
  }

  function getReportImageUrls(report: Report) {
    const imagePaths = report.images?.length ? report.images : report.file ? [report.file] : [];
    return imagePaths
      .map((path) => resolveFileUrl(path))
      .filter((path): path is string => Boolean(path) && isImageFile(path));
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return Number.isNaN(date.getTime()) ? dateString : date.toLocaleString();
  }

  async function openReportDetails(report: Report) {
    setDetailsReport(report);
    setComments([]);
    setCommentsLoading(true);
    setCommentError(null);

    try {
      const data = await getReportComments(report.id);
      setComments(data);
    } catch {
      setCommentError("এই রিপোর্টের মন্তব্য লোড করা যায়নি।");
    } finally {
      setCommentsLoading(false);
    }
  }

  function closeReportDetails() {
    setDetailsReport(null);
    setCommentInput("");
    setCommentError(null);
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detailsReport) return;

    const content = commentInput.trim();
    if (!content) return;

    const token = getAccessToken();
    if (!token) {
      setCommentError("মন্তব্য করতে আগে লগইন করুন।");
      return;
    }

    setCommentSubmitting(true);
    setCommentError(null);

    try {
      const created = await createReportComment(detailsReport.id, { content }, token);
      setComments((prev) => [...prev, created]);
      setCommentInput("");
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : "মন্তব্য পোস্ট করা যায়নি।");
    } finally {
      setCommentSubmitting(false);
    }
  }

  const detailsImageUrls = detailsReport ? getReportImageUrls(detailsReport) : [];
  const detailsAttachmentUrl = detailsReport?.file ? (resolveFileUrl(detailsReport.file) as string) : null;

  return (
    <>
      <div
        className="relative z-0 h-full w-full min-h-0 overflow-hidden rounded-none bg-transparent"
        role="region"
        aria-label="Map viewport"
      >
        <MapContainer
          center={dhakaPosition}
          zoom={12}
          zoomControl={false}
          scrollWheelZoom
          className="cityzen-map h-full w-full outline-none"
          style={{ height: "100%", width: "100%", backgroundColor: "#f8fafc" }}
        >
          <MapClickPicker
            onPick={onLocationPick}
            onMapClick={(lat, lng) => setSelectedPosition([lat, lng])}
          />
          <ZoomControl position="bottomleft" />
          
          <TileLayer
            attribution='&copy; Google'
            url="https://{s}.google.com/vt/lyrs=m&hl=bn&x={x}&y={y}&z={z}"
            subdomains={["mt0", "mt1", "mt2", "mt3"]}
          />

          <Marker position={selectedPosition}>
            <Popup closeButton={false} className="custom-leaflet-popup">
              <div className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-900/5">
                <PopupCloseButton />
                <p className="pr-6 text-sm font-medium text-slate-700">
                  নির্বাচিত স্থান: {selectedPosition[0].toFixed(5)}, {selectedPosition[1].toFixed(5)}
                </p>
              </div>
            </Popup>
          </Marker>

          {reports.map((report) => {
            const position = parseLocation(report.location);
            if (!position) return null;

            const imageUrls = getReportImageUrls(report);
            const hasImage = imageUrls.length > 0;

            return (
              <Marker key={report.id} position={position} icon={createCategoryIcon(report.category)}>
                {/* Note: Leaflet injects its own wrapper. 
                  Using inline styles and tailwind on the inner div overpowers the default look nicely.
                */}
                <Popup closeButton={false} minWidth={280} maxWidth={320}>
                  <div className="-m-3 relative overflow-hidden rounded-2xl bg-white p-5 shadow-xl ring-1 ring-slate-900/5">
                    <PopupCloseButton />
                    
                    <h4 className="mb-1.5 pr-6 text-lg font-bold leading-tight text-slate-900">{report.title}</h4>
                    <p className="mb-3 line-clamp-2 text-sm text-slate-500">{report.description}</p>
                    
                    {hasImage && (
                      <div className="relative mb-4 overflow-hidden rounded-xl bg-slate-100">
                        <img
                          src={imageUrls[0]}
                          alt={`${report.title} preview`}
                          className="h-32 w-full object-cover transition-transform duration-300 hover:scale-105"
                          loading="lazy"
                        />
                        {imageUrls.length > 1 && (
                          <div className="absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-1 text-xs font-semibold text-white backdrop-blur-md">
                            +{imageUrls.length - 1} more
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mb-4 grid grid-cols-2 gap-y-2 text-sm">
                      <div className="text-slate-500">ক্যাটাগরি</div>
                      <div>
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold capitalize ring-1 ring-inset ${
                            report.category === "danger" ? "bg-red-50 text-red-700 ring-red-600/10"
                            : report.category === "help" ? "bg-blue-50 text-blue-700 ring-blue-600/10"
                            : report.category === "warning" ? "bg-amber-50 text-amber-700 ring-amber-600/10"
                            : "bg-emerald-50 text-emerald-700 ring-emerald-600/10"
                          }`}
                        >
                          {report.category}
                        </span>
                      </div>
                      <div className="text-slate-500">এলাকা</div>
                      <div className="font-medium text-slate-900 truncate">{report.area}</div>
                      <div className="text-slate-500">স্ট্যাটাস</div>
                      <div className="font-medium text-slate-900 capitalize">{report.status}</div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="flex-1 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
                        onClick={() => openReportDetails(report)}
                      >
                        বিস্তারিত দেখুন
                      </button>
                      {onEditReport && (
                        <button
                          type="button"
                          className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 active:scale-95"
                          onClick={() => onEditReport(report)}
                        >
                          সম্পাদনা
                        </button>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      <ReportViewModal
        isOpen={Boolean(detailsReport)}
        report={detailsReport}
        comments={comments}
        commentsLoading={commentsLoading}
        commentError={commentError}
        commentInput={commentInput}
        commentSubmitting={commentSubmitting}
        imageUrls={detailsImageUrls}
        attachmentUrl={detailsAttachmentUrl}
        onClose={closeReportDetails}
        onEditReport={onEditReport}
        onCommentInputChange={setCommentInput}
        onSubmitComment={submitComment}
        formatDate={formatDate}
      />

      {/* Global override for Leaflet's default popup background/padding to make the custom styling seamless */}
      <style dangerouslySetInnerHTML={{__html: `
        .leaflet-popup-content-wrapper {
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .leaflet-popup-tip-container {
          display: none !important;
        }
        .leaflet-popup-content {
          margin: 0 !important;
          width: auto !important;
        }
      `}} />
    </>
  );
}