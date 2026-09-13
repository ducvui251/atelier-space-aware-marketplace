import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@atelier/config",
    "@atelier/contracts",
  ],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "openaccess-cdn.clevelandart.org", pathname: "/**" },
      // Artwork images uploaded via POST /api/uploads/image (G-05) are
      // served from the project's Supabase Storage public URL, which is
      // always <project-ref>.supabase.co — wildcard the subdomain instead
      // of hardcoding one project ref so this works across environments.
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
};

export default nextConfig;
