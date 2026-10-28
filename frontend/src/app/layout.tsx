import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.scss";

export const metadata: Metadata = {
  title: "OpenFund",
  description: "Прозрачное финансирование независимых проектов в Ethereum Sepolia.",
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
