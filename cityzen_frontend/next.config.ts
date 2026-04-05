import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.0.230",
    "http://192.168.0.230:3000",
    "https://192.168.0.230:3000",
    "localhost",
    "http://localhost:3000",
    "https://localhost:3000",
    "127.0.0.1",
    "http://127.0.0.1:3000",
    "https://127.0.0.1:3000",
  ],
  images: {
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
      },
      {
        protocol: "http",
        hostname: "192.168.0.230",
        port: "8000",
      },
    ],
  },
};

export default nextConfig;
