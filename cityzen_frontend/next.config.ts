import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "172.16.0.2",
    "http://172.16.0.2:3000",
    "https://172.16.0.2:3000",
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
        protocol: "https",
        hostname: "project-cityzen.onrender.com",
      },
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
