import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "pg-native", "pg-pool", "pg-connection-string", "pgpass"],
  experimental: {
    serverActions: {
      bodySizeLimit: "4.5mb",
    },
  },
};

export default nextConfig;
