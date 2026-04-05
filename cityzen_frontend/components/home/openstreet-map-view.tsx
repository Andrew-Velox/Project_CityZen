"use client";

import { useEffect } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { Report } from "@/lib/api/types";

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

function RefreshMapSize() {
  const map = useMap();

  useEffect(() => {
    const refresh = () => map.invalidateSize();

    const timer = window.setTimeout(refresh, 120);
    window.addEventListener("resize", refresh);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", refresh);
    };
  }, [map]);

  return null;
}

type LocationPickerProps = {
  onPick: (lat: number, lng: number) => void;
};

function LocationPicker({ onPick }: LocationPickerProps) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

type OpenStreetMapViewProps = {
  selectedPosition: [number, number] | null;
  onLocationPick: (lat: number, lng: number) => void;
  reports: Report[];
  currentUsername: string | null;
  onEditReport: (report: Report) => void;
};

export default function OpenStreetMapView({
  selectedPosition,
  onLocationPick,
  reports,
  currentUsername,
  onEditReport,
}: OpenStreetMapViewProps) {
  useEffect(() => {
    // Ensure marker icons work in Next.js build output.
    delete (L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: unknown })._getIconUrl;

    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);

  function parseLocation(location: string): [number, number] | null {
    const parts = location.split(",").map((part) => Number.parseFloat(part.trim()));
    if (parts.length !== 2) return null;
    if (Number.isNaN(parts[0]) || Number.isNaN(parts[1])) return null;
    return [parts[0], parts[1]];
  }

  return (
    <div
      className="mt-3 h-full overflow-hidden rounded-2xl border border-[#d1dbea] shadow-[inset_0_1px_0_#ffffff]"
      role="region"
      aria-label="Map viewport"
    >
      <MapContainer
        center={dhakaPosition}
        zoom={12}
        scrollWheelZoom
        className="h-full w-full min-h-0"
        style={{ height: "100%", width: "100%" }}
      >
        <RefreshMapSize />
        <LocationPicker onPick={onLocationPick} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={dhakaPosition}>
          <Popup>CityZen default location: Dhaka</Popup>
        </Marker>

        {reports.map((report) => {
          const position = parseLocation(report.location);
          if (!position) return null;

          return (
            <Marker key={report.id} position={position} icon={createCategoryIcon(report.category)}>
              <Popup>
                <div className="min-w-[220px]">
                  <h4 className="mb-2 text-[1rem] font-bold text-[#0f172a]">{report.title}</h4>
                  <p className="my-1 text-[0.86rem] text-[#334155]">{report.description}</p>
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

                  {currentUsername && currentUsername === report.author ? (
                    <button
                      type="button"
                      className="mt-2 rounded-lg border border-[#c7d3e6] bg-[#edf2fa] px-2.5 py-1.5 font-bold text-[#2b456f] transition hover:bg-[#e1e9f6]"
                      onClick={() => onEditReport(report)}
                    >
                      Edit report
                    </button>
                  ) : null}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {selectedPosition ? (
          <Marker position={selectedPosition}>
            <Popup>Selected report location</Popup>
          </Marker>
        ) : null}
      </MapContainer>
    </div>
  );
}
