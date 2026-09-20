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
      { protocol: "https", hostname: "images.metmuseum.org", pathname: "/**" },
      // Artwork images uploaded via POST /api/uploads/image (G-05) are
      // served from the project's Supabase Storage public URL, which is
      // always <project-ref>.supabase.co — wildcard the subdomain instead
      // of hardcoding one project ref so this works across environments.
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
    // deviceSizes controls which widths the image optimizer accepts. The
    // default list (640/750/828/1080/1200/1920/2048/3840) only covers a few
    // fixed breakpoints — fill-mode images on arbitrary container widths can
    // request any size and get a 400 from the optimizer. Add common breakpoints
    // so the optimizer always has a valid target instead of rejecting the
    // request outright.
    deviceSizes: [320, 480, 640, 750, 828, 1024, 1080, 1200, 1440, 1920, 2048, 3840],
  },
};

export default nextConfig;
