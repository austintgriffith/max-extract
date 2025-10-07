"use client";

import type { NextPage } from "next";
import { ActiveSectors } from "~~/components/ActiveSectors";
import { AnimatedSubtitle } from "~~/components/AnimatedSubtitle";
import { ChapterLoader } from "~~/components/ChapterLoader";
import { ConnectionStatus } from "~~/components/ConnectionStatus";
import { GameBuyIn } from "~~/components/GameBuyIn";
import { HeroSection } from "~~/components/HeroSection";
import { StorySection } from "~~/components/StorySection";
import { useGameServerStatus } from "~~/hooks/useGameServerStatus";

const Home: NextPage = () => {
  const gameServerStatus = useGameServerStatus();

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

          <ActiveSectors />
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
