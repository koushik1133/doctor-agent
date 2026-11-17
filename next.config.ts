import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
  // Native / worker-thread packages must load from node_modules at runtime.
  serverExternalPackages: ["tesseract.js", "@tesseract.js-data/eng", "@napi-rs/canvas", "unpdf"],
};

export default nextConfig;
