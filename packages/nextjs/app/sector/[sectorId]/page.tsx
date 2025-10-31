"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { SectorCanvas } from "~~/components/SectorCanvas";
import { SectorEvents } from "~~/components/SectorEvents";
import { SectorInfoBox } from "~~/components/SectorInfoBox";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { useParticleCleanup } from "~~/hooks/useParticleCleanup";
import { useSectorData } from "~~/hooks/useSectorData";
import { useSectorOwner } from "~~/hooks/useSectorOwner";
import { useSectorWebSocket } from "~~/hooks/useSectorWebSocket";
import { useVectorMatching } from "~~/hooks/useVectorMatching";
import {
  Asteroid,
  Particle,
  Pilot,
  SECTOR_CONFIG,
  SelectedObject,
  ShipDetails,
  StationDetails,
  Vector2D,
} from "~~/types/sector";
import { getGameServerHttpUrl } from "~~/utils/scaffold-eth/getGameServerUrl";

const SectorPage = () => {
  const params = useParams();
  const sectorId = params?.sectorId as string;
  const [particles, setParticles] = useState<Particle[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [showTargeting, setShowTargeting] = useState(false);

  // Selection state
  const [selectedObject, setSelectedObject] = useState<SelectedObject | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<StationDetails | ShipDetails | Asteroid | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [clickPosition, setClickPosition] = useState<Vector2D | null>(null); // Original click position
  const [adjustedBoxPosition, setAdjustedBoxPosition] = useState<Vector2D | null>(null); // Adjusted info box position
  const [pilotStats, setPilotStats] = useState<{ stats: any; ethBalance: string } | null>(null); // Cache pilot stats

  // Custom hooks for data management
  const { sectorData, setSectorData, error } = useSectorData({ sectorId });
  const { connectionStatus, events, wsRef } = useSectorWebSocket({
    sectorId,
    setSectorData,
    setParticles,
  });
  const { ownerAddress, score, sectorName, auditStatus, isLoading: ownerLoading } = useSectorOwner(sectorId);

  // Fetch registry details when station is selected
  const shouldFetchStation = selectedObject?.type === "station";
  const sectorIdBigInt = BigInt(sectorId);
  const { data: sectorInfo } = useScaffoldReadContract({
    contractName: "MaxExtract",
    functionName: "getSectorInfo",
    args: [sectorIdBigInt],
    query: {
      enabled: shouldFetchStation,
    },
  });

  // Fetch audit status for registry
  const registryAddress =
    sectorInfo && Array.isArray(sectorInfo) && sectorInfo.length >= 2 ? (sectorInfo[1] as string) : "0x0";
  const shouldFetchAudit = Boolean(registryAddress && registryAddress !== "0x0" && selectedObject?.type === "station");
  const { data: auditedChapter } = useScaffoldReadContract({
    contractName: "Auditor",
    functionName: "isAudited",
    args: [registryAddress],
    query: {
      enabled: shouldFetchAudit,
    },
  });

  // Fetch about info for registry
  const shouldFetchAbout = Boolean(registryAddress && registryAddress !== "0x0" && selectedObject?.type === "station");
  const { data: aboutInfo } = useScaffoldReadContract({
    contractName: "MaxExtract",
    functionName: "getAboutInfo",
    args: [registryAddress],
    query: {
      enabled: shouldFetchAbout,
    },
  });

  // Game logic hooks
  useVectorMatching({ sectorData, setSectorData, wsRef, sectorId });
  useParticleCleanup({ particles, setParticles, setSectorData });

  // Handle initial object selection and fetch static data (pilot stats, station info)
  useEffect(() => {
    if (!selectedObject) {
      setSelectedDetails(null);
      setClickPosition(null);
      setAdjustedBoxPosition(null);
      setPilotStats(null);
      return;
    }

    setIsLoadingDetails(true);
    setClickPosition(selectedObject.screenPosition);

    const fetchDetails = async () => {
      try {
        if (selectedObject.type === "station") {
          // Wait for contract calls to complete
          if (sectorInfo && Array.isArray(sectorInfo) && sectorInfo.length >= 5) {
            const [owner, registry, playerScore] = sectorInfo as [string, string, bigint, string, string];
            const aboutData = aboutInfo && Array.isArray(aboutInfo) ? aboutInfo : ["", ""];
            const [aboutName, aboutSocial] = aboutData as [string, string];

            const stationDetails: StationDetails = {
              sectorId,
              ownerAddress: owner,
              registryAddress: registry,
              aboutAddress: registry !== "0x0000000000000000000000000000000000000000" ? registry : undefined,
              stationName: aboutName || sectorName,
              social: aboutSocial || undefined,
              score: Number(playerScore),
              auditStatus:
                sectorName && sectorName !== "(pending audit)"
                  ? "audited"
                  : sectorName === "(pending audit)"
                    ? "pending"
                    : "none",
              auditedChapter: auditedChapter ? Number(auditedChapter) : undefined,
            };
            setSelectedDetails(stationDetails);
            setIsLoadingDetails(false);
          }
        } else if (selectedObject.type === "ship" && sectorData) {
          // Fetch pilot details from API only once (if not already cached)
          const ship = sectorData.ships[selectedObject.id];

          if (ship) {
            // If we already have pilot stats cached, use them immediately
            if (pilotStats) {
              const shipDetails: ShipDetails = {
                ...ship,
                ...pilotStats,
              };
              setSelectedDetails(shipDetails);
              setIsLoadingDetails(false);
            } else {
              // Fetch pilot stats from API
              try {
                const response = await fetch(`${getGameServerHttpUrl()}/api/pilots`);
                const data = await response.json();
                const pilot = data.pilots.find(
                  (p: Pilot) => p.address.toLowerCase() === ship.pilotAddress.toLowerCase(),
                );

                if (pilot) {
                  setPilotStats({
                    stats: pilot.stats,
                    ethBalance: pilot.ethBalance,
                  });
                  const shipDetails: ShipDetails = {
                    ...ship,
                    stats: pilot.stats,
                    ethBalance: pilot.ethBalance,
                  };
                  setSelectedDetails(shipDetails);
                } else {
                  // Fallback if pilot not found in API
                  const fallbackStats = {
                    stats: {
                      fuel: 100,
                      cargo: 100,
                      aggression: 0,
                      intelligence: 0,
                      dexterity: 0,
                    },
                    ethBalance: "0",
                  };
                  setPilotStats(fallbackStats);
                  const shipDetails: ShipDetails = {
                    ...ship,
                    ...fallbackStats,
                  };
                  setSelectedDetails(shipDetails);
                }
              } catch (error) {
                console.error("Failed to fetch pilot details:", error);
                // Fallback with ship data only
                const fallbackStats = {
                  stats: {
                    fuel: 100,
                    cargo: 100,
                    aggression: 0,
                    intelligence: 0,
                    dexterity: 0,
                  },
                  ethBalance: "0",
                };
                setPilotStats(fallbackStats);
                const shipDetails: ShipDetails = {
                  ...ship,
                  ...fallbackStats,
                };
                setSelectedDetails(shipDetails);
              }
              setIsLoadingDetails(false);
            }
          }
        } else if (selectedObject.type === "asteroid" && sectorData) {
          // Use existing asteroid data
          const asteroid = sectorData.asteroids[selectedObject.id];

          if (asteroid) {
            setSelectedDetails(asteroid as Asteroid);
          }
          setIsLoadingDetails(false);
        }
      } catch (error) {
        console.error("Error fetching selection details:", error);
        setIsLoadingDetails(false);
      }
    };

    fetchDetails();
  }, [selectedObject, sectorId, sectorInfo, aboutInfo, auditedChapter, sectorName, sectorData, pilotStats]);

  // Live update ship/asteroid position and velocity from sectorData
  useEffect(() => {
    if (!selectedObject || !sectorData) return;

    if (selectedObject.type === "ship") {
      const ship = sectorData.ships[selectedObject.id];
      if (ship && pilotStats) {
        const shipDetails: ShipDetails = {
          ...ship,
          ...pilotStats,
        };
        setSelectedDetails(shipDetails);
      }
    } else if (selectedObject.type === "asteroid") {
      const asteroid = sectorData.asteroids[selectedObject.id];
      if (asteroid) {
        setSelectedDetails(asteroid as Asteroid);
      }
    }
  }, [sectorData, selectedObject, pilotStats]);

  // Close info box when selected object goes off-screen
  useEffect(() => {
    if (!selectedObject || !sectorData) return;

    // Stations don't move, so skip this check
    if (selectedObject.type === "station") return;

    // Check if object still exists in sector data - if not, close the info box
    let objectExists = false;
    if (selectedObject.type === "ship") {
      objectExists = !!sectorData.ships[selectedObject.id];
    } else if (selectedObject.type === "asteroid") {
      objectExists = !!sectorData.asteroids[selectedObject.id];
    }

    if (!objectExists) {
      console.log("Closing info box - object no longer exists:", selectedObject.type, selectedObject.id);
      setSelectedObject(null);
      return;
    }

    let currentPosition: Vector2D | null = null;

    if (selectedObject.type === "ship") {
      const ship = sectorData.ships[selectedObject.id];
      if (ship?.position && ship?.velocity && ship?.spawnTime) {
        const elapsed = Date.now() - ship.spawnTime;
        currentPosition = {
          x: ship.position.x + ship.velocity.x * (elapsed / 1000),
          y: ship.position.y + ship.velocity.y * (elapsed / 1000),
        };
      }
    } else if (selectedObject.type === "asteroid") {
      const asteroid = sectorData.asteroids[selectedObject.id];
      if (asteroid?.position && asteroid?.velocity && asteroid?.spawnTime) {
        const elapsed = Date.now() - asteroid.spawnTime;
        currentPosition = {
          x: asteroid.position.x + asteroid.velocity.x * (elapsed / 1000),
          y: asteroid.position.y + asteroid.velocity.y * (elapsed / 1000),
        };
      }
    }

    // Check if object is off-screen (with padding buffer)
    if (currentPosition) {
      const buffer = 100; // Extra buffer before closing
      const isOffScreen =
        currentPosition.x < -buffer ||
        currentPosition.x > SECTOR_CONFIG.WIDTH + buffer ||
        currentPosition.y < -buffer ||
        currentPosition.y > SECTOR_CONFIG.HEIGHT + buffer;

      if (isOffScreen) {
        console.log(
          "Closing info box - object went off-screen:",
          selectedObject.type,
          selectedObject.id,
          currentPosition,
        );
        setSelectedObject(null);
      }
    }

    // Check periodically (every 500ms)
    const interval = setInterval(() => {
      if (!selectedObject || !sectorData) return;

      // Check if object still exists in sector data - if not, close the info box
      let objectExists = false;
      if (selectedObject.type === "ship") {
        objectExists = !!sectorData.ships[selectedObject.id];
      } else if (selectedObject.type === "asteroid") {
        objectExists = !!sectorData.asteroids[selectedObject.id];
      }

      if (!objectExists) {
        console.log("Closing info box (periodic) - object no longer exists:", selectedObject.type, selectedObject.id);
        setSelectedObject(null);
        return;
      }

      let pos: Vector2D | null = null;

      if (selectedObject.type === "ship") {
        const ship = sectorData.ships[selectedObject.id];
        if (ship?.position && ship?.velocity && ship?.spawnTime) {
          const elapsed = Date.now() - ship.spawnTime;
          pos = {
            x: ship.position.x + ship.velocity.x * (elapsed / 1000),
            y: ship.position.y + ship.velocity.y * (elapsed / 1000),
          };
        }
      } else if (selectedObject.type === "asteroid") {
        const asteroid = sectorData.asteroids[selectedObject.id];
        if (asteroid?.position && asteroid?.velocity && asteroid?.spawnTime) {
          const elapsed = Date.now() - asteroid.spawnTime;
          pos = {
            x: asteroid.position.x + asteroid.velocity.x * (elapsed / 1000),
            y: asteroid.position.y + asteroid.velocity.y * (elapsed / 1000),
          };
        }
      }

      if (pos) {
        const buffer = 100;
        const isOffScreen =
          pos.x < -buffer ||
          pos.x > SECTOR_CONFIG.WIDTH + buffer ||
          pos.y < -buffer ||
          pos.y > SECTOR_CONFIG.HEIGHT + buffer;

        if (isOffScreen) {
          console.log(
            "Closing info box (periodic) - object went off-screen:",
            selectedObject.type,
            selectedObject.id,
            pos,
          );
          setSelectedObject(null);
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [selectedObject, sectorData]);

  // Handle object selection
  const handleObjectSelect = (object: SelectedObject | null) => {
    setSelectedObject(object);
  };

  // Handle outside clicks to deselect
  const handlePageClick = () => {
    if (selectedObject) {
      setSelectedObject(null);
    }
  };

  // Handle info box position adjustment (updates during dragging)
  const handlePositionAdjusted = (newPosition: Vector2D) => {
    setAdjustedBoxPosition(newPosition);
  };

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
    <div className="container mx-auto px-4 py-8" onClick={handlePageClick}>
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
      <div className="card bg-base-100 shadow-xl mb-6" onClick={e => e.stopPropagation()}>
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
            selectedObject={selectedObject}
            onObjectSelect={handleObjectSelect}
            infoBoxPosition={adjustedBoxPosition}
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

      {/* Info Box for Selected Object */}
      {selectedObject && clickPosition && (
        <SectorInfoBox
          objectType={selectedObject.type}
          position={clickPosition}
          onClose={() => setSelectedObject(null)}
          data={selectedDetails}
          isLoading={isLoadingDetails}
          onPositionAdjusted={handlePositionAdjusted}
        />
      )}
    </div>
  );
};

export default SectorPage;
