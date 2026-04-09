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

// --- Custom Modern Marker Generator ---
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
      <div class="cityzen-report-marker" style="--marker-color:${meta.hex};">
        <span class="cityzen-report-marker__pulse"></span>
        <span class="cityzen-report-marker__pulse cityzen-report-marker__pulse--delay"></span>
        <div class="cityzen-report-marker__pin">
          <span style="
            transform:rotate(45deg);
            color:#ffffff;
            font-size:${meta.symbol === "OK" ? "10px" : "14px"};
            font-weight:800;
            line-height:1;
          ">${meta.symbol}</span>
        </div>
      </div>
    `,
    className: "cityzen-report-marker-icon bg-transparent border-none",
    iconSize: [56, 68],
    iconAnchor: [28, 62],
    popupAnchor: [0, -54],
  });
}

// --- Map Camera Controller for Smooth/Fast Animations ---
function MapFocusController({ target, requestKey }: { target: [number, number] | null; requestKey: number }) {
  const map = useMap();

  useEffect(() => {
    if (!target) return;

    const targetLatLng = L.latLng(target[0], target[1]);
    const distance = map.getCenter().distanceTo(targetLatLng);
    const zoomTarget = Math.max(map.getZoom(), 15);

    map.stop(); // Immediate stop for high responsiveness
    map.closePopup();

    if (distance < 600) {
      // Very fast, buttery pan for nearby items
      map.panTo(targetLatLng, {
        animate: true,
        duration: 0.4, 
        easeLinearity: 0.1,
      });
    } else {
      // Snappy, modern flight for long distances
      const flyDuration = distance < 4000 ? 0.7 : 1.0;
      map.flyTo(targetLatLng, zoomTarget, {
        animate: true,
        duration: flyDuration,
        easeLinearity: 0.1, 
      });
    }
  }, [map, requestKey, target]);

  return null;
}

// --- Map Click Handler ---
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

// --- Custom Popup Close Button ---
function PopupCloseButton() {
  const map = useMap();
  return (
    <button
      type="button"
      onClick={() => map.closePopup()}
      aria-label="Close popup"
      className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-slate-100/80 text-slate-500 backdrop-blur-sm transition-all hover:bg-slate-200 hover:text-slate-800"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

// --- Utility Functions ---
function parseLocation(location: string): [number, number] | null {
  const parts = location.split(",").map((part) => Number.parseFloat(part.trim()));
  if (parts.length !== 2) return null;
  if (Number.isNaN(parts[0]) || Number.isNaN(parts[1])) return null;
  return [parts[0], parts[1]];
}

type OpenStreetMapViewProps = {
  reports: Report[];
  onLocationPick?: (lat: number, lng: number) => void;
  onEditReport?: (report: Report) => void;
  focusLocation?: string | null;
  focusRequestKey?: number;
};

// --- Main Component ---
export default function OpenStreetMapView({
  reports,
  onLocationPick,
  onEditReport,
  focusLocation,
  focusRequestKey = 0,
}: OpenStreetMapViewProps) {
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
      setCommentError("এই রিপোর্টের মন্তব্য লোড করা যায়নি।");
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
      setCommentError(err instanceof Error ? err.message : "মন্তব্য পোস্ট করা যায়নি।");
    } finally {
      setCommentSubmitting(false);
    }
  }

  const detailsImageUrls = detailsReport ? getReportImageUrls(detailsReport) : [];
  const detailsAttachmentUrl = detailsReport?.file ? (resolveFileUrl(detailsReport.file) as string) : null;

  return (
    <>
      <div className="relative z-0 h-full w-full overflow-hidden bg-transparent">
        <MapContainer
          center={dhakaPosition}
          zoom={7.3}
          zoomControl={false}
          className="h-full w-full outline-none"
        >
          <MapClickPicker 
            onPick={onLocationPick} 
            onMapClick={(lat, lng) => setSelectedPosition([lat, lng])} 
          />
          <MapFocusController target={focusLocation ? parseLocation(focusLocation) : null} requestKey={focusRequestKey} />
          <ZoomControl position="bottomleft" />
          
          <TileLayer
            attribution='&copy; Google'
            url="https://{s}.google.com/vt/lyrs=m&hl=bn&x={x}&y={y}&z={z}"
            subdomains={["mt0", "mt1", "mt2", "mt3"]}
          />

          {/* User Selection Marker */}
          <Marker position={selectedPosition}>
            <Popup closeButton={false}>
              <div className="relative overflow-hidden rounded-2xl bg-white/95 p-4 shadow-xl backdrop-blur-md ring-1 ring-slate-900/10 animate-in fade-in zoom-in-95 duration-200">
                <PopupCloseButton />
                <p className="pr-6 text-sm font-semibold text-slate-700">
                  নির্বাচিত স্থান: {selectedPosition[0].toFixed(4)}, {selectedPosition[1].toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>

          {/* Active Reports Markers */}
          {reports.map((report) => {
            const position = parseLocation(report.location);
            if (!position) return null;

            const imageUrls = getReportImageUrls(report);
            const hasImage = imageUrls.length > 0;

            return (
              <Marker key={report.id} position={position} icon={createCategoryIcon(report.category)}>
                <Popup closeButton={false} minWidth={280} maxWidth={320}>
                  <div className="-m-3 relative overflow-hidden rounded-2xl bg-white/95 p-5 shadow-2xl backdrop-blur-xl ring-1 ring-slate-900/10 animate-in fade-in zoom-in-95 duration-200">
                    <PopupCloseButton />
                    
                    <h4 className="mb-1 pr-6 text-[1.1rem] font-extrabold leading-tight tracking-tight text-slate-900">{report.title}</h4>
                    <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-slate-500">{report.description}</p>
                    
                    {hasImage && (
                      <div className="relative mb-4 overflow-hidden rounded-xl bg-slate-100 shadow-inner">
                        <img
                          src={imageUrls[0]}
                          alt={`${report.title} preview`}
                          className="h-32 w-full object-cover transition-transform duration-500 hover:scale-105"
                          loading="lazy"
                        />
                        {imageUrls.length > 1 && (
                          <div className="absolute bottom-2 right-2 rounded-lg bg-slate-900/70 px-2 py-1 text-[10px] font-bold tracking-wider text-white backdrop-blur-md">
                            +{imageUrls.length - 1} MORE
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mb-5 grid grid-cols-2 gap-y-3 border-t border-slate-100 pt-4 text-sm">
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">ক্যাটাগরি</div>
                      <div>
                        <span
                          className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-bold capitalize shadow-sm ring-1 ring-inset ${
                            report.category === "danger" ? "bg-red-50 text-red-700 ring-red-600/20"
                            : report.category === "help" ? "bg-blue-50 text-blue-700 ring-blue-600/20"
                            : report.category === "warning" ? "bg-amber-50 text-amber-700 ring-amber-600/20"
                            : "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                          }`}
                        >
                          {report.category}
                        </span>
                      </div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">এলাকা</div>
                      <div className="font-medium text-slate-900 truncate">{report.area}</div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="flex-1 rounded-xl bg-gradient-to-b from-blue-500 to-blue-600 px-3 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:from-blue-600 hover:to-blue-700 active:scale-95"
                        onClick={() => openReportDetails(report)}
                      >
                        বিস্তারিত দেখুন
                      </button>
                      {onEditReport && (
                        <button
                          type="button"
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-blue-600 active:scale-95"
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

      {/* Global CSS for Hardware Accelerated Smooth Animations & Map Tweaks */}
      <style dangerouslySetInnerHTML={{__html: `
        .cityzen-report-marker {
          will-change: transform;
          position: relative;
          width: 56px;
          height: 68px;
          display: flex;
          justify-content: center;
          pointer-events: none;
        }
        .cityzen-report-marker__pulse {
          position: absolute;
          top: 10px;
          width: 36px;
          height: 36px;
          border-radius: 100%;
          border: 2px solid var(--marker-color);
          opacity: 0;
          /* Faster, snappier pulse curve */
          animation: marker-pulse 1.4s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }
        .cityzen-report-marker__pulse--delay {
          animation-delay: 0.7s;
        }
        .cityzen-report-marker__pin {
          width: 38px;
          height: 38px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          background: var(--marker-color);
          border: 2.5px solid #fff;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes marker-pulse {
          0% { transform: scale(0.6); opacity: 0; }
          20% { opacity: 0.7; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        /* Fixes for Leaflet UI smoothness */
        .leaflet-popup-content-wrapper {
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .leaflet-popup-tip-container { display: none !important; }
        .leaflet-zoom-animated { transition-timing-function: cubic-bezier(0.2, 0, 0, 1) !important; }
      `}} />
    </>
  );
}