import { FundingModesSection } from "@/widgets/FundingModesSection/FundingModesSection";
import { HeroSection } from "@/widgets/HeroSection/HeroSection";
import { TrustSection } from "@/widgets/TrustSection/TrustSection";

export default function HomePage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <HeroSection />
      <FundingModesSection />
      <TrustSection />
    </main>
  );
}
