import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["ag360-navy.vercel.app", "localhost:3000"],
    },
  },
};

export default nextConfig;