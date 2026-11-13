import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  reactStrictMode: true,
  // Backend на том же источнике: браузер ходит в /api/*, а сервер Next передаёт запрос backend.
  // Только для разработки: в продакшене /api маршрутизирует reverse proxy, потому что прокси Next
  // не сообщает backend адрес клиента (docs/DECISIONS.md#frontend-and-backend-share-one-origin).
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${process.env.BACKEND_URL ?? "http://127.0.0.1:4000"}/:path*` }];
  },
};

export default nextConfig;
