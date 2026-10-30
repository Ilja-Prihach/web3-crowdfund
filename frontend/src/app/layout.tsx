import type { Metadata } from "next";
import { Manrope, PT_Serif } from "next/font/google";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { cookieToInitialState } from "wagmi";

import { WrongNetworkBanner } from "@/features/wallet/ui/WrongNetworkBanner/WrongNetworkBanner";
import { getWagmiConfig } from "@/shared/config/wagmi";
import { AppFooter } from "@/widgets/AppFooter/AppFooter";
import { AppHeader } from "@/widgets/AppHeader/AppHeader";

import "./globals.scss";
import { Providers } from "./providers";

const interfaceFont = Manrope({
  display: "swap",
  subsets: ["cyrillic", "latin"],
  variable: "--font-interface",
});

const editorialFont = PT_Serif({
  display: "swap",
  style: ["normal", "italic"],
  subsets: ["cyrillic", "latin"],
  variable: "--font-editorial",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "OpenFund",
    template: "%s — OpenFund",
  },
  description: "Прозрачное финансирование независимых проектов в Ethereum Sepolia.",
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default async function RootLayout({ children }: RootLayoutProps) {
  const initialState = cookieToInitialState(getWagmiConfig(), (await headers()).get("cookie"));

  return (
    <html className={`${interfaceFont.variable} ${editorialFont.variable}`} lang="ru">
      <body>
        <a className="skipLink" href="#main-content">
          Перейти к содержимому
        </a>
        <Providers initialState={initialState}>
          <AppHeader />
          <WrongNetworkBanner />
          {children}
          <AppFooter />
        </Providers>
      </body>
    </html>
  );
}
