"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { SectorCanvas } from "~~/components/SectorCanvas";
import { SectorEvents } from "~~/components/SectorEvents";
import { Address } from "~~/components/scaffold-eth";
import { useParticleCleanup } from "~~/hooks/useParticleCleanup";
import { useSectorData } from "~~/hooks/useSectorData";
import { useSectorOwner } from "~~/hooks/useSectorOwner";
import { useSectorWebSocket } from "~~/hooks/useSectorWebSocket";
import { useVectorMatching } from "~~/hooks/useVectorMatching";
import { Particle } from "~~/types/sector";

const SectorPage = () => {
  const params = useParams();
  const sectorId = params?.sectorId as string;
  const [particles, setParticles] = useState<Particle[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [showTargeting, setShowTargeting] = useState(false);

  // Custom hooks for data management
  const { sectorData, setSectorData, error } = useSectorData({ sectorId });
  const { connectionStatus, events, wsRef } = useSectorWebSocket({
    sectorId,
    setSectorData,
    setParticles,
  });
  const { ownerAddress, score, sectorName, auditStatus, isLoading: ownerLoading } = useSectorOwner(sectorId);

  // Game logic hooks
  useVectorMatching({ sectorData, setSectorData, wsRef, sectorId });
  useParticleCleanup({ particles, setParticles, setSectorData });

  // Keyboard shortcuts for toggling grid, debug, and targeting
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "g" || e.key === "G") {
        setShowGrid(prev => !prev);
      } else if (e.key === "d" || e.key === "D") {
        setShowDebug(prev => !prev);
      } else if (e.key === "t" || e.key === "T") {
        setShowTargeting(prev => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  // Auto-reload functionality when there's an error
  useEffect(() => {
    if (error) {
      setCountdown(5);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            window.location.reload();
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    } else {
      setCountdown(null);
    }
  }, [error]);

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Link href="/" className="btn btn-sm btn-ghost mb-4">
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Home
        </Link>
        <div className="alert alert-error">
          <div>
            <span>{error}</span>
            {countdown !== null && (
              <div className="mt-2 text-sm">
                Auto-reloading in {countdown} second{countdown !== 1 ? "s" : ""}...
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!sectorData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Link href="/" className="btn btn-sm btn-ghost mb-4">
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Home
        </Link>
        <div className="flex items-center justify-center h-64">
          <span className="loading loading-spinner loading-lg"></span>
          <span className="ml-4">Loading sector data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="btn btn-sm btn-ghost">
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Home
        </Link>

        <div className="flex items-center gap-4">
          <div
            className={`badge ${
              connectionStatus === "connected"
                ? "badge-success"
                : connectionStatus === "connecting"
                  ? "badge-warning"
                  : "badge-error"
            }`}
          >
            {connectionStatus}
          </div>
          <h1 className="text-xl font-bold">Sector {sectorId.slice(0, 8)}...</h1>
        </div>
      </div>

      {/* Sector Visualization */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          {ownerLoading ? (
            <div className="flex items-center gap-2 mb-2">
              <div className="skeleton h-6 w-48"></div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-2 mb-2 text-sm">
              {auditStatus === "audited" && sectorName ? (
                <span className="font-bold">{sectorName}</span>
              ) : auditStatus === "pending" ? (
                <span className="font-bold opacity-60">(audit pending)</span>
              ) : (
                <span className="font-bold opacity-50">Unnamed Sector</span>
              )}
              {ownerAddress && (
                <>
                  <span className="opacity-50">•</span>
                  <Address address={ownerAddress} />
                </>
              )}
              {score !== undefined && (
                <>
                  <span className="opacity-50">•</span>
                  <span className="font-semibold">Score: {score.toLocaleString()}</span>
                </>
              )}
            </div>
          )}
          <SectorCanvas
            sectorData={sectorData}
            particles={particles}
            sectorId={sectorId}
            showGrid={showGrid}
            showDebug={showDebug}
            showTargeting={showTargeting}
          />
          <div className="text-xs text-center mt-2">
            <span style={{ opacity: showGrid ? 1 : 0.77 }}>
              <kbd className="kbd kbd-xs">G</kbd> Grid
            </span>
            {" • "}
            <span style={{ opacity: showDebug ? 1 : 0.77 }}>
              <kbd className="kbd kbd-xs">D</kbd> Debug
            </span>
            {" • "}
            <span style={{ opacity: showTargeting ? 1 : 0.77 }}>
              <kbd className="kbd kbd-xs">T</kbd> Targeting
            </span>
          </div>
        </div>
      </div>

      {/* Recent Events */}
      <SectorEvents events={events} />
    </div>
  );
};

export default SectorPage;
