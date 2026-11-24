import type { NextConfig } from "next";

const standalone = process.env.OPENFUND_STANDALONE === "1";
const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_OPENFUND_DEMO: process.env.NEXT_PUBLIC_OPENFUND_DEMO ?? "0" },
  agentRules: false,
  experimental: { agentUpgrade: "security" },
  reactStrictMode: true,
  output: standalone ? "standalone" : undefined,
  // При локальном запуске с Node.js /api обрабатывается через Next. В Compose его обслуживает Nginx.
  ...(standalone ? {} : {
    async rewrites() {
      return [{ source: "/api/:path*", destination: `${process.env.BACKEND_URL ?? "http://127.0.0.1:4000"}/:path*` }];
    },
  }),
};

export default nextConfig;
