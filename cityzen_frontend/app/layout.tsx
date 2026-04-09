import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import { CityNavbar } from "@/components/home/city-navbar";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CityZen",
  description: "CityZen authentication and user workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="bn"
      className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="relative flex min-h-dvh flex-col overflow-x-hidden bg-transparent">
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
          <div className="absolute inset-0 bg-[linear-gradient(140deg,#f5fcfb_0%,#e8f6ff_52%,#e0f4ef_100%)]" />
          <div className="home-aurora-orb home-aurora-orb--one" />
          <div className="home-aurora-orb home-aurora-orb--two" />
          <div className="home-aurora-orb home-aurora-orb--three" />
          <div className="home-aurora-sheen" />
        </div>

        <div className="relative z-10 flex min-h-dvh flex-col">
          <CityNavbar />
          <div className="min-h-0 flex-1">{children}</div>
        </div>
      </body>
    </html>
  );
}
