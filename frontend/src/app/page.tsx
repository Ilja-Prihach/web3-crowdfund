import { FundingModesSection } from "@/widgets/FundingModesSection/FundingModesSection";
import { HeroSection } from "@/widgets/HeroSection/HeroSection";
import { HomeOverview } from "@/widgets/HomeOverview/HomeOverview";
import { HowItWorksSection } from "@/widgets/HowItWorksSection/HowItWorksSection";
import { ProjectStatusSection } from "@/widgets/ProjectStatusSection/ProjectStatusSection";
import { TrustSection } from "@/widgets/TrustSection/TrustSection";

export default function HomePage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <HeroSection />
      <HomeOverview />
      <HowItWorksSection />
      <FundingModesSection />
      <TrustSection />
      <ProjectStatusSection />
    </main>
  );
}
