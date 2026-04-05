import { CityNavbar } from "@/components/home/city-navbar";
import { OpenStreetMapPanel } from "@/components/home/openstreet-map";

export default function Home() {
  return (
    <main className="home-shell">
      <div className="auth-grid-overlay" />
      <CityNavbar />

      <OpenStreetMapPanel />
    </main>
  );
}
