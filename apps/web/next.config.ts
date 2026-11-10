import type { NextConfig } from "next";

const ideCrmBaseUrl = (
  process.env.IDE_CRM_BASE_URL || "http://localhost:3004"
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  transpilePackages: ["@gestor-ide/core", "@gestor-ide/sdk", "@gestor-ide/auth"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [
      {
        source: "/api/crm/:path*",
        destination: `${ideCrmBaseUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
