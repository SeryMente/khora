import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "pg-native", "pg-pool", "pg-connection-string", "pgpass", "ffmpeg-static"],
  outputFileTracingIncludes: { "/api/dictado": ["./node_modules/ffmpeg-static/**"], "/api/audio/*/mp3": ["./node_modules/ffmpeg-static/**"] },
  experimental: { serverActions: { bodySizeLimit: "4.5mb" } },
};
export default nextConfig;
