"use client";

import dynamic from "next/dynamic";

const OpenStreetMapView = dynamic(() => import("@/components/home/openstreet-map-view"), {
  ssr: false,
  loading: () => <div className="map-loading">Loading map...</div>,
});

export function OpenStreetMapPanel() {
  return (
    <section className="map-card" aria-label="City map section">
      <div className="map-card-head">
        <p className="dashboard-label">OpenStreetMap</p>
        <h2>Live city map</h2>
        <p>Explore your city zone using real map tiles from OpenStreetMap.</p>
      </div>

      <OpenStreetMapView />
    </section>
  );
}
