import { OpenStreetMapPanel } from "@/components/home/openstreet-map";

export default function Home() {
  return (
    <main className="relative flex min-h-[calc(100dvh-5.5rem)] flex-col overflow-hidden px-3 pb-3 md:px-4 md:pb-4">
      <div className="relative z-10 flex h-full w-full flex-1 flex-col">
        <header className="px-2 py-3 sm:px-3 sm:py-4">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            CityZen
          </h1>
          <p className="mt-1 font-mono text-xs tracking-[0.16em] text-slate-600 sm:text-sm">
            Smart Citizen Services Platform
          </p>
        </header>
        <OpenStreetMapPanel />
      </div>
    </main>
  );
}