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
      lang="en"
      className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="flex min-h-dvh flex-col overflow-x-hidden">
        <div className="relative z-[2500] px-3 pt-3 md:px-4 md:pt-4">
          <CityNavbar />
        </div>
        <div className="min-h-0 flex-1">{children}</div>
      </body>
    </html>
  );
}
