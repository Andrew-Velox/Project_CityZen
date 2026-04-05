"use client";

import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents, ZoomControl } from "react-leaflet";
import { API_BASE_URL } from "@/config/api";
import { createReportComment, getReportComments } from "@/lib/api/report";
import { getAccessToken } from "@/lib/auth/token-store";
import type { Report, ReportComment } from "@/lib/api/types";

const dhakaPosition: [number, number] = [23.8103, 90.4125];

function createCategoryIcon(category: Report["category"]) {
  const categoryMeta = {
    danger: { bg: "#b42318", emoji: "!" },
    help: { bg: "#1d4ed8", emoji: "?" },
    warning: { bg: "#b54708", emoji: "!" },
    healthy: { bg: "#027a48", emoji: "OK" },
  } as const;

  const meta = categoryMeta[category] || categoryMeta.warning;

  return L.divIcon({
    html: `
      <div style="
        background:${meta.bg};
        width:34px;
        height:34px;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        border:2px solid #fff;
        box-shadow:0 4px 10px #00000047;
        display:flex;
        align-items:center;
        justify-content:center;
      ">
        <span style="
          transform:rotate(45deg);
          color:#fff;
          font-size:11px;
          font-weight:700;
          line-height:1;
        ">${meta.emoji}</span>
      </div>
    `,
    className: "",
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -32],
  });
}

type OpenStreetMapViewProps = {
  reports: Report[];
  onLocationPick?: (lat: number, lng: number) => void;
};

function MapClickPicker({ onPick }: { onPick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
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
      className="absolute right-0 top-0 inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#c9d5e9] bg-[#f4f7fd] text-[1rem] font-bold leading-none text-[#405a83] transition hover:bg-[#e9f0fb] hover:text-[#203b67]"
    >
      ×
    </button>
  );
}

function parseLocation(location: string): [number, number] | null {
  const parts = location.split(",").map((part) => Number.parseFloat(part.trim()));
  if (parts.length !== 2) return null;
  if (Number.isNaN(parts[0]) || Number.isNaN(parts[1])) return null;
  return [parts[0], parts[1]];
}

export default function OpenStreetMapView({ reports, onLocationPick }: OpenStreetMapViewProps) {
  const [detailsReport, setDetailsReport] = useState<Report | null>(null);
  const [comments, setComments] = useState<ReportComment[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  useEffect(() => {
    // Ensure marker icons work in Next.js build output.
    try {
      delete (L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: unknown })._getIconUrl;
    } catch {
      // Ignore browser-specific prototype delete restrictions.
    }

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
      setCommentError("Could not load comments for this report.");
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
      setCommentError("Please log in to add a comment.");
      return;
    }

    setCommentSubmitting(true);
    setCommentError(null);

    try {
      const created = await createReportComment(detailsReport.id, { content }, token);
      setComments((prev) => [...prev, created]);
      setCommentInput("");
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : "Failed to post comment.");
    } finally {
      setCommentSubmitting(false);
    }
  }

  return (
    <>
      <div
        className="mt-3 h-full min-h-0 overflow-hidden rounded-2xl border border-[#d1dbea] shadow-[inset_0_1px_0_#ffffff]"
        role="region"
        aria-label="Map viewport"
      >
        <MapContainer
          center={dhakaPosition}
          zoom={12}
          zoomControl={false}
          scrollWheelZoom
          className="h-full w-full min-h-0"
          style={{ height: "100%", width: "100%" }}
        >
          <MapClickPicker onPick={onLocationPick} />
          <ZoomControl position="bottomleft" />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={dhakaPosition}>
            <Popup closeButton={false}>
              <div className="relative pr-8 text-[0.88rem] text-[#334155]">
                <PopupCloseButton />
                CityZen default location: Dhaka
              </div>
            </Popup>
          </Marker>

          {reports.map((report) => {
            const position = parseLocation(report.location);
            if (!position) return null;

            const fileUrl = resolveFileUrl(report.file);
            const hasImage = isImageFile(fileUrl);

            return (
              <Marker key={report.id} position={position} icon={createCategoryIcon(report.category)}>
                <Popup closeButton={false}>
                  <div className="relative w-[min(72vw,260px)] min-w-[180px] pr-8">
                    <PopupCloseButton />
                    <h4 className="mb-2 text-[1rem] font-bold text-[#0f172a]">{report.title}</h4>
                    <p className="my-1 line-clamp-2 text-[0.86rem] text-[#334155]">{report.description}</p>
                    {hasImage && fileUrl ? (
                      <img
                        src={fileUrl}
                        alt={`${report.title} preview`}
                        className="my-2 h-24 w-full rounded-lg border border-[#d4deee] object-cover"
                        loading="lazy"
                      />
                    ) : null}
                    <p className="my-1 text-[0.86rem] text-[#334155]">
                      <strong>Category:</strong>{" "}
                      <span
                        className={`inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-[0.76rem] font-bold capitalize ${
                          report.category === "danger"
                            ? "border-[#f4c8c1] bg-[#fff2ef] text-[#b9382c]"
                            : report.category === "help"
                              ? "border-[#bfd0ee] bg-[#edf2fb] text-[#1f4fd7]"
                              : report.category === "warning"
                                ? "border-[#efd6ad] bg-[#fff7ea] text-[#aa6a13]"
                                : "border-[#b9e5d0] bg-[#edf9f3] text-[#167a52]"
                        }`}
                      >
                        {report.category}
                      </span>
                    </p>
                    <p className="my-1 text-[0.86rem] text-[#334155]">
                      <strong>Area:</strong> {report.area}
                    </p>
                    <p className="my-1 text-[0.86rem] text-[#334155]">
                      <strong>Status:</strong> {report.status}
                    </p>
                    <p className="my-1 text-[0.86rem] text-[#334155]">
                      <strong>Owner:</strong> {report.author}
                    </p>
                    <button
                      type="button"
                      className="mt-2 rounded-lg border border-[#c7d3e6] bg-[#edf2fa] px-2.5 py-1.5 font-bold text-[#2b456f] transition hover:bg-[#e1e9f6]"
                      onClick={() => openReportDetails(report)}
                    >
                      View full details
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {detailsReport && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[12000] grid place-items-center overflow-x-hidden bg-[#111d356b] p-3 backdrop-blur-[3px] sm:p-4"
              role="dialog"
              aria-modal="true"
              aria-label="Report details"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) closeReportDetails();
              }}
            >
              <section className="relative w-[min(95vw,720px)] max-h-[92dvh] overflow-x-hidden overflow-y-auto rounded-[20px] border border-[#d2dbe9] bg-gradient-to-b from-[#ffffff] to-[#f8fbff] p-3 shadow-[0_30px_64px_#12234533] sm:p-4 md:p-5">
                <header className="sticky top-0 z-10 -mx-3 -mt-3 mb-3 rounded-t-[20px] border-b border-[#d7e0ee] bg-[#ffffffee] px-3 py-3 pr-12 backdrop-blur sm:-mx-4 sm:-mt-4 sm:px-4 md:-mx-5 md:-mt-5 md:px-5">
                  <div className="min-w-0 break-words">
                    <h2 className="text-[1.08rem] font-bold text-[#0f172a] sm:text-[1.25rem]">{detailsReport.title}</h2>
                    <p className="mt-1 text-[0.8rem] text-[#475569] sm:text-[0.84rem]">Posted by {detailsReport.author} on {formatDate(detailsReport.created_at)}</p>
                  </div>
                  <button
                    type="button"
                    className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#c7d3e6] bg-[#edf2fa] text-[1.2rem] font-bold leading-none text-[#2b456f] sm:right-4 md:right-5"
                    onClick={closeReportDetails}
                    aria-label="Close modal"
                  >
                    ×
                  </button>
                </header>

                <div className="grid gap-3 break-words text-[0.88rem] text-[#334155] sm:text-[0.92rem]">
                  <p>{detailsReport.description}</p>
                  <p><strong>Area:</strong> {detailsReport.area}</p>
                  <p><strong>Category:</strong> {detailsReport.category}</p>
                  <p><strong>Status:</strong> {detailsReport.status}</p>
                  <p><strong>Location:</strong> {detailsReport.location}</p>
                  {detailsReport.file ? (
                    <div>
                      {isImageFile(resolveFileUrl(detailsReport.file)) ? (
                        <img
                          src={resolveFileUrl(detailsReport.file) as string}
                          alt={`${detailsReport.title} attachment`}
                          className="mt-1 max-h-[38vh] w-full rounded-xl border border-[#d4deee] object-cover"
                        />
                      ) : (
                        <a
                          href={resolveFileUrl(detailsReport.file) as string}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex rounded-lg border border-[#c7d3e6] bg-[#edf2fa] px-2.5 py-1.5 font-semibold text-[#2b456f]"
                        >
                          Open attachment
                        </a>
                      )}
                    </div>
                  ) : null}
                </div>

                <hr className="my-4 border-[#d7e0ee]" />

                <section>
                  <h3 className="mb-2 text-[1rem] font-bold text-[#0f172a]">Comments</h3>

                  {commentError ? (
                    <p className="mb-2 rounded-xl border border-[#f4c8c1] bg-[#fff2ef] px-3 py-2 text-[0.88rem] font-semibold text-[#b9382c]">
                      {commentError}
                    </p>
                  ) : null}

                  {commentsLoading ? (
                    <p className="text-[0.9rem] text-[#64748b]">Loading comments...</p>
                  ) : comments.length === 0 ? (
                    <p className="text-[0.9rem] text-[#64748b]">No comments yet.</p>
                  ) : (
                    <div className="max-h-[180px] space-y-2 overflow-y-auto pr-1 sm:max-h-[220px]">
                      {comments.map((comment) => (
                        <article key={comment.id} className="rounded-xl border border-[#d7e0ee] bg-[#ffffff] px-3 py-2">
                          <p className="text-[0.83rem] font-semibold text-[#334155]">
                            {comment.author} • {formatDate(comment.created_at)}
                          </p>
                          <p className="mt-1 text-[0.9rem] text-[#1e293b]">{comment.content}</p>
                        </article>
                      ))}
                    </div>
                  )}

                  <form className="mt-3 grid gap-2 sm:flex" onSubmit={submitComment}>
                    <input
                      className="block min-h-[42px] w-full flex-1 rounded-xl border border-[#d0d9e8] bg-[#fafcff] px-3 py-2 text-[0.94rem] text-[#0f172a] outline-none transition focus:border-[#1f4fd7]"
                      value={commentInput}
                      onChange={(event) => setCommentInput(event.target.value)}
                      placeholder="Write a comment"
                    />
                    <button
                      type="submit"
                      disabled={commentSubmitting || !commentInput.trim()}
                      className="rounded-xl border border-transparent bg-gradient-to-br from-[#1f4fd7] to-[#173ea8] px-4 py-2 font-semibold text-[#ffffff] disabled:cursor-not-allowed disabled:opacity-70 sm:min-w-[90px]"
                    >
                      {commentSubmitting ? "Posting..." : "Post"}
                    </button>
                  </form>
                </section>
              </section>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
