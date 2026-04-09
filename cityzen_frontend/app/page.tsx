import { OpenStreetMapPanel } from "@/components/home/openstreet-map";

export default function Home() {
  return (
    <main className="relative flex min-h-[calc(100dvh-5.5rem)] flex-col overflow-hidden px-3 pb-3 md:px-4 md:pb-4">
      <div className="relative z-10 flex h-full w-full flex-1 flex-col">
        <OpenStreetMapPanel />
      </div>
    </main>
  );
}