"use client";

import type { NextPage } from "next";
import { AnimatedSubtitle } from "~~/components/AnimatedSubtitle";
import { ChapterLoader } from "~~/components/ChapterLoader";
import { ConnectionStatus } from "~~/components/ConnectionStatus";
import { GameBuyIn } from "~~/components/GameBuyIn";
import { HeroSection } from "~~/components/HeroSection";
import { MaintenanceMode } from "~~/components/MaintenanceMode";
import { StorySection } from "~~/components/StorySection";
import { useGameServerStatus } from "~~/hooks/useGameServerStatus";
import { usePlaceholder } from "~~/hooks/usePlaceholder";

const Home: NextPage = () => {
  const gameServerStatus = useGameServerStatus();
  const { placeholder, isLoading } = usePlaceholder();

  // Show maintenance mode if placeholder is set
  if (!isLoading && placeholder && placeholder.trim() !== "") {
    return <MaintenanceMode message={placeholder} />;
  }

  return (
    <>
      <div className="flex items-center flex-col grow">
        {/* Hero Image - Full Width with Bleed */}
        <HeroSection />

        {/* Animated Subtitle with Underscores - Positioned between hero and background */}
        <AnimatedSubtitle />

        {/* Background Image Section with Story */}
        <StorySection>
          <ChapterLoader />
        </StorySection>

        {/* Game Buy-in Section */}
        <div className="w-full px-5 py-8">
          <GameBuyIn />
        </div>

        <ConnectionStatus gameServerStatus={gameServerStatus} />
      </div>
    </>
  );
};

export default Home;
