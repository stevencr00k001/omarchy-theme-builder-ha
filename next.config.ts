import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  poweredByHeader: false,
  // A fixed build id keeps the committed panel bundle reproducible, so CI can diff it.
  generateBuildId: async () => "omarchy-themes",
  productionBrowserSourceMaps: false,
  ...(basePath
    ? {
        basePath,
        assetPrefix: basePath,
      }
    : {}),
};

export default nextConfig;
