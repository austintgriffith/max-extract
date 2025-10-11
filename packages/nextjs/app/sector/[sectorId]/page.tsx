"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { SectorCanvas } from "~~/components/SectorCanvas";
import { SectorEvents } from "~~/components/SectorEvents";
import { useParticleCleanup } from "~~/hooks/useParticleCleanup";
import { useSectorData } from "~~/hooks/useSectorData";
import { useSectorWebSocket } from "~~/hooks/useSectorWebSocket";
import { useVectorMatching } from "~~/hooks/useVectorMatching";
import { Particle } from "~~/types/sector";

const SectorPage = () => {
  const params = useParams();
  const sectorId = params?.sectorId as string;
  const [particles, setParticles] = useState<Particle[]>([]);

  // Custom hooks for data management
  const { sectorData, setSectorData, error } = useSectorData({ sectorId });
  const { connectionStatus, events, wsRef } = useSectorWebSocket({
    sectorId,
    setSectorData,
    setParticles,
  });

  // Game logic hooks
  useVectorMatching({ sectorData, setSectorData, wsRef, sectorId });
  useParticleCleanup({ particles, setParticles, setSectorData });

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Link href="/" className="btn btn-sm btn-ghost mb-4">
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Home
        </Link>
        <div className="alert alert-error">
          <span>{error}</span>
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
          <h1 className="text-xl font-bold">Sector {sectorId}</h1>
        </div>
      </div>

      {/* Sector Visualization */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title">Sector View</h2>
          <SectorCanvas sectorData={sectorData} particles={particles} sectorId={sectorId} />
        </div>
      </div>

      {/* Recent Events */}
      <SectorEvents events={events} />
    </div>
  );
};

export default SectorPage;
