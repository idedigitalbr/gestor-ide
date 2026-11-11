import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  transpilePackages: ["@gestor-ide/core", "@gestor-ide/sdk", "@gestor-ide/auth"],
  experimental: {
    agentUpgrade: "security",
  },
};

export default nextConfig;
