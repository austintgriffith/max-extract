"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Address } from "./scaffold-eth";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { Asteroid, SelectedObjectType, ShipDetails, StationDetails, Vector2D } from "~~/types/sector";

interface SectorInfoBoxProps {
  objectType: SelectedObjectType;
  position: Vector2D;
  onClose: () => void;
  data: StationDetails | ShipDetails | Asteroid | null;
  isLoading?: boolean;
  onPositionAdjusted?: (adjustedPosition: Vector2D) => void;
}

export const SectorInfoBox = ({
  objectType,
  position,
  onClose,
  data,
  isLoading,
  onPositionAdjusted,
}: SectorInfoBoxProps) => {
  const { targetNetwork } = useTargetNetwork();

  // Adjust position to keep box within viewport
  const boxWidth = 320;
  const boxHeight = 400;
  const padding = 20;

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Vector2D>({ x: 0, y: 0 });
  const [draggedPosition, setDraggedPosition] = useState<Vector2D | null>(null);

  // Real-time position tracking for asteroids and ships
  const [currentAsteroidPosition, setCurrentAsteroidPosition] = useState<Vector2D | null>(null);
  const [currentShipPosition, setCurrentShipPosition] = useState<Vector2D | null>(null);
  const [currentShipVelocity, setCurrentShipVelocity] = useState<Vector2D | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const shipAnimationFrameRef = useRef<number | null>(null);

  let adjustedX = position.x + 80; // Offset farther to the right
  let adjustedY = position.y + 50; // Offset farther down

  // Apply dragged position if user has dragged the box
  if (draggedPosition) {
    adjustedX = draggedPosition.x;
    adjustedY = draggedPosition.y;
  }

  // Keep within right boundary
  if (adjustedX + boxWidth > window.innerWidth - padding) {
    adjustedX = position.x - boxWidth - 20;
  }

  // Keep within bottom boundary
  if (adjustedY + boxHeight > window.innerHeight - padding) {
    adjustedY = window.innerHeight - boxHeight - padding;
  }

  // Keep within top boundary
  if (adjustedY < padding) {
    adjustedY = padding;
  }

  // Keep within left boundary
  if (adjustedX < padding) {
    adjustedX = padding;
  }

  // Handle drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start drag if clicking on the header/body, not on buttons or interactive elements
    if ((e.target as HTMLElement).closest("button")) return;

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - adjustedX,
      y: e.clientY - adjustedY,
    });
  };

  // Handle dragging
  useEffect(() => {
    if (!isDragging) return;

    let lastPosition: Vector2D | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      // Keep within viewport bounds
      const boundedX = Math.max(padding, Math.min(newX, window.innerWidth - boxWidth - padding));
      const boundedY = Math.max(padding, Math.min(newY, window.innerHeight - boxHeight - padding));

      // Only update if position actually changed
      if (!lastPosition || lastPosition.x !== boundedX || lastPosition.y !== boundedY) {
        const newPosition = { x: boundedX, y: boundedY };
        lastPosition = newPosition;
        setDraggedPosition(newPosition);

        // Update the connecting line position while dragging
        if (onPositionAdjusted) {
          onPositionAdjusted(newPosition);
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset.x, dragOffset.y, padding, boxWidth, boxHeight, onPositionAdjusted]);

  // Reset dragged position when a new object is selected
  useEffect(() => {
    setDraggedPosition(null);
  }, [position.x, position.y]);

  // Update asteroid position in real-time
  useEffect(() => {
    if (objectType !== "asteroid" || !data) {
      setCurrentAsteroidPosition(null);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const asteroid = data as Asteroid;

    const updatePosition = () => {
      if (asteroid.position && asteroid.velocity && asteroid.spawnTime) {
        const elapsed = Date.now() - asteroid.spawnTime;
        const currentPos = {
          x: asteroid.position.x + asteroid.velocity.x * (elapsed / 1000),
          y: asteroid.position.y + asteroid.velocity.y * (elapsed / 1000),
        };
        setCurrentAsteroidPosition(currentPos);
      }
      animationFrameRef.current = requestAnimationFrame(updatePosition);
    };

    updatePosition();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [objectType, data]);

  // Update ship position and velocity in real-time
  useEffect(() => {
    if (objectType !== "ship" || !data) {
      setCurrentShipPosition(null);
      setCurrentShipVelocity(null);
      if (shipAnimationFrameRef.current) {
        cancelAnimationFrame(shipAnimationFrameRef.current);
      }
      return;
    }

    const ship = data as ShipDetails;

    const updatePosition = () => {
      if (ship.position && ship.velocity && ship.spawnTime) {
        const elapsed = Date.now() - ship.spawnTime;
        const currentPos = {
          x: ship.position.x + ship.velocity.x * (elapsed / 1000),
          y: ship.position.y + ship.velocity.y * (elapsed / 1000),
        };
        setCurrentShipPosition(currentPos);
        setCurrentShipVelocity(ship.velocity);
      }
      shipAnimationFrameRef.current = requestAnimationFrame(updatePosition);
    };

    updatePosition();

    return () => {
      if (shipAnimationFrameRef.current) {
        cancelAnimationFrame(shipAnimationFrameRef.current);
      }
    };
  }, [objectType, data]);

  // Notify parent of initial adjusted position (only when not dragging)
  useEffect(() => {
    if (onPositionAdjusted && !draggedPosition) {
      const newPosition = { x: adjustedX, y: adjustedY };
      onPositionAdjusted(newPosition);
    }
    // Only run when position or draggedPosition changes, not on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position.x, position.y, draggedPosition]);

  const renderStationInfo = (station: StationDetails) => {
    // Determine station display name
    let displayName = "(Unknown Station)";
    if (station.auditStatus === "audited" && station.stationName) {
      displayName = station.stationName;
    } else if (station.auditStatus === "pending") {
      displayName = "(Pending Audit)";
    }

    return (
      <>
        <div className="text-lg font-bold text-cyan-400 mb-3 border-b border-cyan-600 pb-2 flex items-center gap-2">
          <Image src="/bases/base1.png" alt="station" width={24} height={24} className="object-contain" />
          <span>{displayName}</span>
        </div>

        <div className="space-y-2 text-xs">
          {/* Owner - Top Level */}
          <div>
            <div className="text-gray-400 uppercase tracking-wide text-[10px] mb-1">Owner</div>
            <Address address={station.ownerAddress} />
          </div>

          {/* Score - Top Level */}
          <div>
            <div className="text-gray-400 uppercase tracking-wide text-[10px] mb-1">Score</div>
            <div className="font-mono text-yellow-400 text-lg">
              {station.score !== undefined && !isNaN(station.score) ? station.score.toLocaleString() : "0"}
            </div>
          </div>

          {/* Registry Contract */}
          <div>
            <div className="text-gray-400 uppercase tracking-wide text-[10px] mb-1 flex items-center gap-1">
              Registry Contract
              {station.auditStatus === "audited" && <span className="text-green-400">✓</span>}
              {station.auditedChapter && (
                <span className="text-gray-500 text-[9px] font-normal">Ch.{station.auditedChapter}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Address address={station.registryAddress} />
              <Link
                href={`https://abi.ninja/${station.registryAddress}/${targetNetwork.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-70 transition-opacity"
              >
                <Image src="/abininja.svg" alt="View on ABI Ninja" width={24} height={24} className="opacity-80" />
              </Link>
            </div>
          </div>

          {/* Registered Modules - Indented under Registry */}
          {(station.aboutAddress || station.credentialAddress) && (
            <div className="ml-4 space-y-2 border-l-2 border-cyan-800 pl-3">
              {station.aboutAddress && (
                <div>
                  <div className="text-gray-400 uppercase tracking-wide text-[10px] mb-1 flex items-center gap-1">
                    About Module
                    {station.aboutAuditedChapter === 2 ? (
                      <span className="text-green-400">✓</span>
                    ) : (
                      <span className="text-yellow-400">⚠️</span>
                    )}
                    {station.aboutAuditedChapter && (
                      <span className="text-gray-500 text-[9px] font-normal">
                        {station.aboutAuditedChapter === 2 ? "Ch.2" : `Ch.${station.aboutAuditedChapter}`}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Address address={station.aboutAddress} />
                    <Link
                      href={`https://abi.ninja/${station.aboutAddress}/${targetNetwork.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:opacity-70 transition-opacity"
                    >
                      <Image
                        src="/abininja.svg"
                        alt="View on ABI Ninja"
                        width={24}
                        height={24}
                        className="opacity-80"
                      />
                    </Link>
                  </div>
                  {station.social && (
                    <div className="mt-1">
                      <div className="text-gray-500 text-[9px] mb-0.5">Social</div>
                      <div className="font-mono text-blue-300 text-[10px] break-all">{station.social}</div>
                    </div>
                  )}
                </div>
              )}
              {station.credentialAddress && (
                <div>
                  <div className="text-gray-400 uppercase tracking-wide text-[10px] mb-1 flex items-center gap-1">
                    Credential Module
                    {station.credentialAuditedChapter === 3 ? (
                      <span className="text-green-400">✓</span>
                    ) : (
                      <span className="text-yellow-400">⚠️</span>
                    )}
                    {station.credentialAuditedChapter && (
                      <span className="text-gray-500 text-[9px] font-normal">
                        {station.credentialAuditedChapter === 3 ? "Ch.3" : `Ch.${station.credentialAuditedChapter}`}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Address address={station.credentialAddress} />
                    <Link
                      href={`https://abi.ninja/${station.credentialAddress}/${targetNetwork.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:opacity-70 transition-opacity"
                    >
                      <Image
                        src="/abininja.svg"
                        alt="View on ABI Ninja"
                        width={24}
                        height={24}
                        className="opacity-80"
                      />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sector ID - Separate */}
          <div>
            <div className="text-gray-400 uppercase tracking-wide text-[10px] mb-1">Sector ID</div>
            <div className="font-mono text-green-400">
              {station.sectorId ? `${station.sectorId.slice(0, 16)}...` : "Unknown"}
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderShipInfo = (ship: ShipDetails) => {
    // Defensive checks
    if (!ship || typeof ship.fuel === "undefined") {
      return (
        <>
          <div className="text-lg font-bold text-cyan-400 mb-3 border-b border-cyan-600 pb-2">PILOT</div>
          <div className="text-red-400 text-center py-4">Incomplete ship data</div>
          <div className="text-gray-400 text-xs text-center break-all">Debug: {JSON.stringify(ship)}</div>
        </>
      );
    }

    const fuelColor =
      ship.fuel > 80
        ? "text-green-400"
        : ship.fuel > 50
          ? "text-yellow-400"
          : ship.fuel > 20
            ? "text-orange-400"
            : "text-red-400";

    return (
      <>
        <div className="flex items-center gap-3 mb-3 border-b border-cyan-600 pb-2">
          <Image
            src={`/ships/ship${ship.shipType}.png`}
            alt={`Ship ${ship.shipType}`}
            width={24}
            height={24}
            className="object-contain"
            style={{ transform: "rotate(90deg)" }}
          />
          <div className="text-lg font-bold text-cyan-400">{ship.pilotName}</div>
        </div>

        <div className="space-y-2 text-xs">
          <div>
            <div className="text-gray-400 uppercase tracking-wide text-[10px] mb-1">Pilot Address</div>
            <Address address={ship.pilotAddress} />
          </div>

          <div>
            <div className="text-gray-400 uppercase tracking-wide text-[10px] mb-1">Ship Type</div>
            <div className="font-mono text-purple-400">Class {ship.shipType}</div>
          </div>

          <div>
            <div className="text-gray-400 uppercase tracking-wide text-[10px] mb-1">Position</div>
            <div className="font-mono text-green-400 text-[10px]">
              X: {currentShipPosition ? currentShipPosition.x.toFixed(1) : ship.position.x.toFixed(1)}, Y:{" "}
              {currentShipPosition ? currentShipPosition.y.toFixed(1) : ship.position.y.toFixed(1)}
            </div>
          </div>

          <div>
            <div className="text-gray-400 uppercase tracking-wide text-[10px] mb-1">Velocity</div>
            <div className="font-mono text-blue-400 text-[10px]">
              ΔX: {currentShipVelocity ? currentShipVelocity.x.toFixed(2) : ship.velocity.x.toFixed(2)}, ΔY:{" "}
              {currentShipVelocity ? currentShipVelocity.y.toFixed(2) : ship.velocity.y.toFixed(2)}
            </div>
            <div className="text-gray-500 text-[9px] mt-1">
              Speed:{" "}
              {currentShipVelocity
                ? Math.sqrt(currentShipVelocity.x ** 2 + currentShipVelocity.y ** 2).toFixed(2)
                : Math.sqrt(ship.velocity.x ** 2 + ship.velocity.y ** 2).toFixed(2)}{" "}
              u/s
            </div>
          </div>

          <div>
            <div className="text-gray-400 uppercase tracking-wide text-[10px] mb-1">Status</div>
            <div className="flex items-center gap-2">
              {ship.state === "mining" && <span className="badge badge-warning badge-sm">Mining</span>}
              {ship.state === "flying" && <span className="badge badge-info badge-sm">Flying</span>}
              {ship.state === "exiting" && <span className="badge badge-ghost badge-sm">Exiting</span>}
              {ship.state === "refueling" && <span className="badge badge-primary badge-sm">Refueling</span>}
              {ship.isVectorMatched && <span className="badge badge-success badge-sm">Locked</span>}
            </div>
          </div>

          <div>
            <div className="text-gray-400 uppercase tracking-wide text-[10px] mb-1">Fuel</div>
            <div className="flex items-center gap-2">
              <div className={`font-mono ${fuelColor} text-lg`}>{ship.fuel.toFixed(1)}%</div>
              <progress className="progress progress-success w-24" value={ship.fuel} max="100"></progress>
            </div>
          </div>

          <div>
            <div className="text-gray-400 uppercase tracking-wide text-[10px] mb-1">Score</div>
            <div className="font-mono text-yellow-400 text-lg">{ship.score.toLocaleString()}</div>
          </div>

          {ship.fullCargo && (
            <div>
              <div className="badge badge-accent badge-sm">Full Cargo</div>
            </div>
          )}

          <div className="pt-2 border-t border-gray-700">
            <div className="text-gray-400 uppercase tracking-wide text-[10px] mb-2">Pilot Stats</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-gray-500 text-[9px]">Fuel Cap</div>
                <div className="font-mono text-green-300">{ship.stats.fuel}</div>
              </div>
              <div>
                <div className="text-gray-500 text-[9px]">Cargo Cap</div>
                <div className="font-mono text-blue-300">{ship.stats.cargo}</div>
              </div>
              <div>
                <div className="text-gray-500 text-[9px]">Aggression</div>
                <div className="font-mono text-red-300">{ship.stats.aggression}</div>
              </div>
              <div>
                <div className="text-gray-500 text-[9px]">Intelligence</div>
                <div className="font-mono text-purple-300">{ship.stats.intelligence}</div>
              </div>
              <div>
                <div className="text-gray-500 text-[9px]">Dexterity</div>
                <div className="font-mono text-yellow-300">{ship.stats.dexterity}</div>
              </div>
              <div>
                <div className="text-gray-500 text-[9px]">ETH Balance</div>
                <div className="font-mono text-cyan-300">{parseFloat(ship.ethBalance).toFixed(6)}</div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderAsteroidInfo = (asteroid: Asteroid) => {
    // Defensive checks
    if (!asteroid || typeof asteroid.size === "undefined") {
      return (
        <>
          <div className="text-lg font-bold text-cyan-400 mb-3 border-b border-cyan-600 pb-2">ASTEROID</div>
          <div className="text-red-400 text-center py-4">Incomplete asteroid data</div>
          <div className="text-gray-400 text-xs text-center">Debug: {JSON.stringify(asteroid)}</div>
        </>
      );
    }

    // Determine size category from size if not provided
    const sizeCategory =
      asteroid.sizeCategory || (asteroid.size >= 100 ? "large" : asteroid.size >= 60 ? "medium" : "small");

    // Get the asteroid image path based on size
    const asteroidImagePath = `/asteroids/asteroid_${sizeCategory}_1.png`;

    // Format ID with "A-" prefix (A = Asteroid)
    const displayId = asteroid.id ? `A-${asteroid.id}` : "Unknown";

    return (
      <>
        <div className="text-lg font-bold text-cyan-400 mb-3 border-b border-cyan-600 pb-2 flex items-center gap-2">
          <Image src={asteroidImagePath} alt="asteroid" width={24} height={24} className="object-contain" />
          <span>{displayId}</span>
        </div>

        <div className="space-y-2 text-xs">
          <div>
            <div className="text-gray-400 uppercase tracking-wide text-[10px] mb-1">Size Category</div>
            <div className="flex items-center gap-2">
              <span
                className={`badge badge-sm ${
                  sizeCategory === "large" ? "badge-error" : sizeCategory === "medium" ? "badge-warning" : "badge-info"
                }`}
              >
                {sizeCategory.toUpperCase()}
              </span>
              <span className="font-mono text-gray-400">{asteroid.size.toFixed(0)} units</span>
            </div>
          </div>

          <div>
            <div className="text-gray-400 uppercase tracking-wide text-[10px] mb-1">Resources</div>
            <div className="flex items-center gap-2">
              <div className="font-mono text-green-400 text-lg">{asteroid.resources?.toFixed(0) || 0}</div>
              <progress className="progress progress-success w-24" value={asteroid.resources || 0} max="500"></progress>
            </div>
          </div>

          <div>
            <div className="text-gray-400 uppercase tracking-wide text-[10px] mb-1">Position</div>
            <div className="font-mono text-green-400">
              X: {currentAsteroidPosition?.x?.toFixed(1) || asteroid.position?.x?.toFixed(1) || 0}, Y:{" "}
              {currentAsteroidPosition?.y?.toFixed(1) || asteroid.position?.y?.toFixed(1) || 0}
            </div>
          </div>

          <div>
            <div className="text-gray-400 uppercase tracking-wide text-[10px] mb-1">Velocity</div>
            <div className="font-mono text-blue-400 text-[10px]">
              ΔX: {asteroid.velocity?.x?.toFixed(2) || 0}, ΔY: {asteroid.velocity?.y?.toFixed(2) || 0}
            </div>
            <div className="text-gray-500 text-[9px] mt-1">
              Speed: {asteroid.velocity ? Math.sqrt(asteroid.velocity.x ** 2 + asteroid.velocity.y ** 2).toFixed(2) : 0}{" "}
              u/s
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div
      className="fixed z-50"
      style={{
        left: `${adjustedX}px`,
        top: `${adjustedY}px`,
        minWidth: `${boxWidth}px`,
      }}
      onClick={e => e.stopPropagation()}
    >
      <div
        className={`relative bg-black/90 backdrop-blur-sm border-2 border-cyan-500 rounded-lg p-4 shadow-2xl ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
        style={{
          boxShadow: "0 0 20px rgba(6, 182, 212, 0.5), inset 0 0 20px rgba(6, 182, 212, 0.1)",
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 btn btn-ghost btn-xs btn-circle text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/30"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <span className="loading loading-spinner loading-md text-cyan-400"></span>
            <span className="ml-3 text-cyan-400">Loading details...</span>
          </div>
        ) : !data ? (
          <div className="text-red-400 text-center py-4">No data available</div>
        ) : (
          <>
            {objectType === "station" && renderStationInfo(data as StationDetails)}
            {objectType === "ship" && renderShipInfo(data as ShipDetails)}
            {objectType === "asteroid" && renderAsteroidInfo(data as Asteroid)}
          </>
        )}

        {/* Connecting line anchor point (invisible, used for positioning) */}
        <div className="absolute left-0 top-1/2 w-1 h-1" data-anchor="true"></div>
      </div>
    </div>
  );
};
