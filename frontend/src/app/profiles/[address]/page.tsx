import type { Metadata } from "next";

import { parseProfileAddress } from "@/entities/profile/api/profileApi";
import { ProfilePage } from "@/widgets/ProfilePage/ProfilePage";

export const metadata: Metadata = { title: "Профиль", description: "Публичный профиль автора и история поддержки проектов OpenFund." };

export default async function Page({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  return <main id="main-content" tabIndex={-1}><ProfilePage address={parseProfileAddress(address)} /></main>;
}
