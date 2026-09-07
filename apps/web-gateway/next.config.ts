import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@atelier/account-service",
    "@atelier/admin-service",
    "@atelier/artist-artwork-service",
    "@atelier/catalog-discovery-service",
    "@atelier/commerce-service",
    "@atelier/config",
    "@atelier/contracts",
    "@atelier/recommendation-service",
    "@atelier/room-preview-service",
    "@atelier/verification-service",
  ],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
