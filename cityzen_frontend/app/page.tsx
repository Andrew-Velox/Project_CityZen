import { OpenStreetMapPanel } from "@/components/home/openstreet-map";

export default function Home() {
  return (
    <main className="relative flex min-h-[calc(100dvh-5.5rem)] flex-col overflow-hidden bg-gradient-to-br from-[#f8fafd] via-[#eff3f9] to-[#e8eef7] px-3 pb-3 md:px-4 md:pb-4">
      <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(to_right,#d8dee8_1px,transparent_1px),linear-gradient(to_bottom,#d8dee8_1px,transparent_1px)] [background-size:34px_34px]" />
      <OpenStreetMapPanel />
    </main>
  );
}
