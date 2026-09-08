import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@atelier/config",
    "@atelier/contracts",
  ],
  images: {
    remotePatterns: [
      // Added per-deployment when artwork imagery moves to Supabase Storage
      // or a CDN; local demo assets live in public/img (ADR 0001 D7).
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
