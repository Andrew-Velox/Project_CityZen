import { CityMapPanel } from "@/components/home/city-map";

export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden p-0">
      <div className="relative z-10 flex h-full w-full flex-1 flex-col">
        <CityMapPanel />
      </div>
    </main>
  );
}