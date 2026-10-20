import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "pg-native", "pg-pool", "pg-connection-string", "pgpass", "ffmpeg-static"],
  outputFileTracingIncludes: { "/api/khora-chat/proxy": [
    "./public/_app/immutable/assets/Toaster.DKF17Rty.css",
    "./public/_app/immutable/assets/Modal.CSlFhZkq.css",
    "./public/_app/immutable/assets/0.MeCDKVUP.css",
  ], "/api/dictado": ["./node_modules/ffmpeg-static/**"], "/api/audio/*/mp3": ["./node_modules/ffmpeg-static/**"] },
  experimental: { serverActions: { bodySizeLimit: "4.5mb" } },
};
export default nextConfig;
