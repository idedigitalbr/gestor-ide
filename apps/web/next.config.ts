import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  transpilePackages: ["@gestor-ide/core", "@gestor-ide/sdk", "@gestor-ide/auth"],
};

export default nextConfig;
