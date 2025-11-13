"use client";

import { useRouter } from "next/navigation";
import { blo } from "blo";
import type { NextPage } from "next";
import { MapIcon } from "@heroicons/react/24/outline";
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
import { usePlayerSector } from "~~/hooks/usePlayerSector";

const Home: NextPage = () => {
  const router = useRouter();
  const gameServerStatus = useGameServerStatus();
  const { placeholder, isLoading } = usePlaceholder();
  const { targetNetwork } = useTargetNetwork();
  const { sectorId, connectedAddress } = usePlayerSector();

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
        <div
          className="fixed top-20 left-4 z-10 tooltip tooltip-right cursor-pointer"
          data-tip="MaxExtract Contract"
          onClick={() => router.push("/contracts")}
        >
          <div className="ring-2 ring-primary rounded-full p-1 bg-base-100 shadow-lg hover:ring-4 transition-all">
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
        <div
          className="fixed top-20 right-4 z-10 tooltip tooltip-left cursor-pointer"
          data-tip="Game Contract"
          onClick={() => router.push("/contracts")}
        >
          <div className="ring-2 ring-secondary rounded-full p-1 bg-base-100 shadow-lg hover:ring-4 transition-all">
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

      {/* Floating Sector Button - Appears after completing chapter 1 */}
      {connectedAddress && sectorId !== "0" && (
        <button
          className="fixed bottom-8 right-8 z-10 btn btn-warning btn-lg rounded-3xl shadow-2xl hover:shadow-warning/50 hover:scale-105 transition-all duration-300 gap-3"
          onClick={() => router.push(`/sector/${sectorId}`)}
        >
          <MapIcon className="h-6 w-6" />
          <span className="font-bold">Go to Sector</span>
          <span className="text-xs opacity-75">s{sectorId.slice(0, 8)}...</span>
        </button>
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
                src="https://www.youtube.com/embed/z91QltgHQcE"
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
