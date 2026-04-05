"use client";

import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

const dhakaPosition: [number, number] = [23.8103, 90.4125];

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

export default function OpenStreetMapView() {
  useEffect(() => {
    // Ensure marker icons work in Next.js build output.
    delete (L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: unknown })._getIconUrl;

    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);

  return (
    <div className="map-frame" role="region" aria-label="Map viewport">
      <MapContainer
        center={dhakaPosition}
        zoom={12}
        scrollWheelZoom
        className="leaflet-map"
      >
        <RefreshMapSize />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={dhakaPosition}>
          <Popup>CityZen default location: Dhaka</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
