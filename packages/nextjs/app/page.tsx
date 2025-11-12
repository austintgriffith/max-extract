"use client";

import { blo } from "blo";
import type { NextPage } from "next";
import { AnimatedSubtitle } from "~~/components/AnimatedSubtitle";
import { ChapterLoader } from "~~/components/ChapterLoader";
import { ConnectionStatus } from "~~/components/ConnectionStatus";
import { GameBuyIn } from "~~/components/GameBuyIn";
import { HeroSection } from "~~/components/HeroSection";
import { MaintenanceMode } from "~~/components/MaintenanceMode";
import { StorySection } from "~~/components/StorySection";
import deployedContracts from "~~/contracts/deployedContracts";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { useGameServerStatus } from "~~/hooks/useGameServerStatus";
import { usePlaceholder } from "~~/hooks/usePlaceholder";

const Home: NextPage = () => {
  const gameServerStatus = useGameServerStatus();
  const { placeholder, isLoading } = usePlaceholder();
  const { targetNetwork } = useTargetNetwork();

  // Get contract addresses from deployed contracts
  const networkId = targetNetwork.id;
  const networkContracts = deployedContracts[networkId as keyof typeof deployedContracts];
  const maxExtractAddress = networkContracts?.MaxExtract?.address;
  const gameAddress = networkContracts?.Game?.address;

  // Show maintenance mode if placeholder is set
  if (!isLoading && placeholder && placeholder.trim() !== "") {
    return <MaintenanceMode message={placeholder} />;
  }

  return (
    <>
      {/* Contract Blockies - Visual signature of deployed contracts */}
      {maxExtractAddress && (
        <div className="fixed top-20 left-4 z-10 tooltip tooltip-bottom" data-tip="MaxExtract Contract">
          <div className="ring-2 ring-primary rounded-full p-1 bg-base-100 shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={blo(maxExtractAddress as `0x${string}`)}
              alt="MaxExtract Contract"
              className="rounded-full"
              width={48}
              height={48}
            />
          </div>
        </div>
      )}
      {gameAddress && (
        <div className="fixed top-20 right-4 z-10 tooltip tooltip-bottom" data-tip="Game Contract">
          <div className="ring-2 ring-secondary rounded-full p-1 bg-base-100 shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={blo(gameAddress as `0x${string}`)}
              alt="Game Contract"
              className="rounded-full"
              width={48}
              height={48}
            />
          </div>
        </div>
      )}

      <div className="flex items-center flex-col grow overflow-x-hidden">
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

        {/* YouTube Video Section */}
        <div className="w-full px-5 py-12 flex justify-center">
          <div className="max-w-4xl w-full">
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded-lg shadow-xl"
                src="https://www.youtube.com/embed/lrUAtOEVuBs"
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
