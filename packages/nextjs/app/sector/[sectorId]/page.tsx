"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useReadContract } from "wagmi";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { SectorCanvas } from "~~/components/SectorCanvas";
import { SectorEvents } from "~~/components/SectorEvents";
import { SectorInfoBox } from "~~/components/SectorInfoBox";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { useParticleCleanup } from "~~/hooks/useParticleCleanup";
import { usePlaceholderRedirect } from "~~/hooks/usePlaceholderRedirect";
import { useSectorData } from "~~/hooks/useSectorData";
import { useSectorOwner } from "~~/hooks/useSectorOwner";
import { useSectorSounds } from "~~/hooks/useSectorSounds";
import { createBaseUpgradeParticles, createPingParticles, useSectorWebSocket } from "~~/hooks/useSectorWebSocket";
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
  // Redirect to home if maintenance mode is active
  usePlaceholderRedirect();

  const params = useParams();
  const sectorId = params?.sectorId as string;
  const [particles, setParticles] = useState<Particle[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Initialize preferences from localStorage with defaults
  const [showGrid, setShowGrid] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("showGrid");
      return saved !== null ? JSON.parse(saved) : true; // Default ON
    }
    return true;
  });
  const [showDebug, setShowDebug] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("showDebug");
      return saved !== null ? JSON.parse(saved) : false;
    }
    return false;
  });
  const [showTargeting, setShowTargeting] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("showTargeting");
      return saved !== null ? JSON.parse(saved) : true; // Default ON
    }
    return true;
  });
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("soundEnabled");
      return saved !== null ? JSON.parse(saved) : true;
    }
    return true;
  });

  // Radar activation modal state - removed, will use audioUnlocked state directly

  // Selection state
  const [selectedObject, setSelectedObject] = useState<SelectedObject | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<StationDetails | ShipDetails | Asteroid | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [clickPosition, setClickPosition] = useState<Vector2D | null>(null); // Original click position
  const [adjustedBoxPosition, setAdjustedBoxPosition] = useState<Vector2D | null>(null); // Adjusted info box position
  const [pilotStats, setPilotStats] = useState<{ stats: any; ethBalance: string } | null>(null); // Cache pilot stats

  // Custom hooks for data management
  const { sectorData, setSectorData, error } = useSectorData({ sectorId });
  const {
    playSound,
    getSonarForAsteroidSize,
    getShipSoundForType,
    getExplosionForAsteroidSize,
    playDrillSound,
    stopDrillSound,
    playRefuelSound,
    stopRefuelSound,
    playShipAttackSequence,
    playShipDestructionSequence,
    getPointsSoundForTipAmount,
    audioUnlocked,
    unlockAudio,
  } = useSectorSounds();

  // Track which ships are currently mining (to avoid duplicate drill sounds)
  const miningShipsRef = useRef<Set<string>>(new Set());

  // Track which ships are currently refueling (to avoid duplicate refuel sounds)
  const refuelingShipsRef = useRef<Set<string>>(new Set());

  // Track previous base type for upgrade sound detection
  const previousBaseTypeRef = useRef<number | null>(null);

  // Track which ping particles have already triggered a station rebroadcast
  const rebroadcastedPingsRef = useRef<Set<string>>(new Set());

  // Track when pings were rebroadcast for cleanup (ping ID -> timestamp)
  const rebroadcastTimestampsRef = useRef<Map<string, number>>(new Map());

  // Track last rebroadcast time for debouncing
  const lastRebroadcastTimeRef = useRef<number>(0);

  // Callback for asteroid spawn sounds and visual effects
  const handleAsteroidSpawn = useCallback(
    (asteroidSize: number, position: Vector2D) => {
      if (soundEnabled) {
        const sonarSound = getSonarForAsteroidSize(asteroidSize);
        playSound(sonarSound, 0.2);
      }
      // Create visual ping effect with thickness based on asteroid size
      // Small asteroids (< 30): thin rings (0.6x)
      // Medium asteroids (30-60): normal rings (1.0x)
      // Large asteroids (> 60): thick rings (1.5x)
      let thickness = 1.0;
      if (asteroidSize < 30) {
        thickness = 0.6;
      } else if (asteroidSize > 60) {
        thickness = 1.5;
      }
      const pingParticles = createPingParticles(position, "rgba(150, 200, 255, 0.35)", thickness);
      setParticles(prev => {
        const combined = [...prev, ...pingParticles];
        // Safety limit: cap at 200 particles
        return combined.length > 200 ? combined.slice(-200) : combined;
      });
    },
    [playSound, getSonarForAsteroidSize, soundEnabled, setParticles],
  );

  // Callback for ship spawn sounds and visual effects
  const handleShipSpawn = useCallback(
    (shipType: number, position: Vector2D) => {
      if (soundEnabled) {
        const shipSound = getShipSoundForType(shipType);
        playSound(shipSound, 0.2);
      }
      // Create visual ping effect with thickness based on ship type
      // Ships 1-4: thin rings (0.6x)
      // Ships 5-8: normal rings (1.0x)
      // Ships 9-12: thick rings (1.4x)
      let thickness = 1.0;
      if (shipType <= 4) {
        thickness = 0.6;
      } else if (shipType >= 9) {
        thickness = 1.4;
      }
      const pingParticles = createPingParticles(position, "rgba(100, 255, 150, 0.35)", thickness);
      setParticles(prev => {
        const combined = [...prev, ...pingParticles];
        // Safety limit: cap at 200 particles
        return combined.length > 200 ? combined.slice(-200) : combined;
      });
    },
    [playSound, getShipSoundForType, soundEnabled, setParticles],
  );

  // Store sectorData in a ref so we can access it without causing re-renders
  const sectorDataRef = useRef(sectorData);
  useEffect(() => {
    sectorDataRef.current = sectorData;
  }, [sectorData]);

  // Callback for vector match (mining or refueling) sounds
  const handleVectorMatched = useCallback(
    (shipId: string) => {
      // Check if the ship is targeting an asteroid (mining) or the station (refueling)
      const currentSectorData = sectorDataRef.current;
      if (currentSectorData?.ships[shipId]) {
        const ship = currentSectorData.ships[shipId];

        if (ship.targetAsteroidId) {
          // Ship is mining an asteroid
          console.log("Ship", shipId, "started mining asteroid", ship.targetAsteroidId);
          if (!soundEnabled) return;

          // Only play drill sound if we haven't already for this ship
          if (!miningShipsRef.current.has(shipId)) {
            console.log("Playing drill sound for new mining session");
            miningShipsRef.current.add(shipId);

            // Play drill sound using shared audio element
            playDrillSound(0.5);
          } else {
            console.log("Ship already mining - skipping duplicate drill sound");
          }
        } else if (ship.targetStationId) {
          // Ship is refueling at station
          console.log("Ship", shipId, "started refueling at station");
          if (!soundEnabled) return;

          // Only play refuel sound if we haven't already for this ship
          if (!refuelingShipsRef.current.has(shipId)) {
            console.log("Playing refuel sound for new refueling session");
            refuelingShipsRef.current.add(shipId);

            // Play refuel sound using shared audio element
            playRefuelSound(0.5);
          } else {
            console.log("Ship already refueling - skipping duplicate refuel sound");
          }
        } else {
          console.log("Ship", shipId, "vector matched but no target");
        }
      }
    },
    [soundEnabled, playDrillSound, playRefuelSound],
  );

  // Callback for asteroid depletion (explosion) sounds
  const handleAsteroidDepleted = useCallback(
    (asteroidSize: number, asteroidId: string) => {
      console.log("Asteroid depleted for asteroid:", asteroidId);

      // Clear mining tracking for all ships
      miningShipsRef.current.clear();

      // STOP the drill sound BEFORE playing explosion
      console.log("Stopping drill sound NOW");
      stopDrillSound();

      if (!soundEnabled) return;

      // Play the explosion
      const explosionSound = getExplosionForAsteroidSize(asteroidSize);
      playSound(explosionSound, 0.6);
    },
    [playSound, stopDrillSound, getExplosionForAsteroidSize, soundEnabled],
  );

  // Callback for ship retarget (when ship starts flying again)
  const handleShipRetarget = useCallback(
    (shipId: string) => {
      console.log("Ship", shipId, "retargeting (starting to fly)");

      // Check if this ship was refueling and stop the refuel sound
      if (refuelingShipsRef.current.has(shipId)) {
        console.log("Stopping refuel sound for ship", shipId);
        refuelingShipsRef.current.delete(shipId);
        stopRefuelSound();
      }

      // Also check if this ship was mining and stop the drill sound
      if (miningShipsRef.current.has(shipId)) {
        console.log("Stopping drill sound for ship", shipId);
        miningShipsRef.current.delete(shipId);
        stopDrillSound();
      }

      // Play blip sound for retargeting
      if (soundEnabled) {
        playSound("blip", 0.33);
      }
    },
    [stopRefuelSound, stopDrillSound, playSound, soundEnabled],
  );

  // Callback for ship attack (when ship pattern matches another ship)
  const handleShipAttack = useCallback(
    (attackerId: string, victimId: string) => {
      console.log("Ship", attackerId, "attacking ship", victimId);
      if (!soundEnabled) return;

      // Play blast1 then blast2 sequence
      playShipAttackSequence(0.5);
    },
    [playShipAttackSequence, soundEnabled],
  );

  // Callback for ship destruction (when ship is destroyed)
  const handleShipDestroyed = useCallback(
    (victimId: string, attackerId: string) => {
      console.log("Ship", victimId, "destroyed by ship", attackerId);
      if (!soundEnabled) return;

      // Play whipsplat, then random death sound after 0.5s at 0.7 volume
      playShipDestructionSequence(0.7);
    },
    [playShipDestructionSequence, soundEnabled],
  );

  // Callback for pilot tip (when pilot tips the player)
  const handlePilotTip = useCallback(
    (tipAmount: number, pilotName: string) => {
      console.log("Pilot", pilotName, "tipped", tipAmount, "points");
      if (!soundEnabled) return;

      // Get the appropriate sound based on tip amount
      const pointsSound = getPointsSoundForTipAmount(tipAmount);
      playSound(pointsSound, 0.35);
    },
    [getPointsSoundForTipAmount, playSound, soundEnabled],
  );

  const { connectionStatus, events, wsRef } = useSectorWebSocket({
    sectorId,
    setSectorData,
    setParticles,
    onAsteroidSpawn: handleAsteroidSpawn,
    onShipSpawn: handleShipSpawn,
    onVectorMatched: handleVectorMatched,
    onAsteroidDepleted: handleAsteroidDepleted,
    onShipRetarget: handleShipRetarget,
    onShipAttack: handleShipAttack,
    onShipDestroyed: handleShipDestroyed,
    onPilotTip: handlePilotTip,
  });
  const { ownerAddress, score, sectorName, auditStatus, isLoading: ownerLoading } = useSectorOwner(sectorId);

  // Fetch registry details when station is selected
  const shouldFetchStation = selectedObject?.type === "station";
  const sectorIdBigInt = sectorId ? BigInt(sectorId) : BigInt(0);
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

  // Fetch about module address from registry
  const { data: aboutModuleAddress } = useReadContract({
    address: registryAddress as `0x${string}`,
    abi: [
      {
        type: "function",
        name: "modules",
        inputs: [{ name: "", type: "string" }],
        outputs: [{ name: "", type: "address" }],
        stateMutability: "view",
      },
    ] as const,
    functionName: "modules",
    args: ["about"],
    query: {
      enabled: shouldFetchAbout,
    },
  });

  // Fetch audit status for about module
  const aboutAddress = aboutModuleAddress as string | undefined;
  const shouldFetchAboutAudit = Boolean(
    aboutAddress && aboutAddress !== "0x0000000000000000000000000000000000000000" && selectedObject?.type === "station",
  );
  const { data: aboutAuditedChapter } = useScaffoldReadContract({
    contractName: "Auditor",
    functionName: "isAudited",
    args: [aboutAddress as `0x${string}`],
    query: {
      enabled: shouldFetchAboutAudit,
    },
  });

  // Fetch credential module address from registry
  const { data: credentialModuleAddress } = useReadContract({
    address: registryAddress as `0x${string}`,
    abi: [
      {
        type: "function",
        name: "modules",
        inputs: [{ name: "", type: "string" }],
        outputs: [{ name: "", type: "address" }],
        stateMutability: "view",
      },
    ] as const,
    functionName: "modules",
    args: ["credential"],
    query: {
      enabled: shouldFetchAbout,
    },
  });

  // Fetch audit status for credential module
  const credentialAddress = credentialModuleAddress as string | undefined;
  const shouldFetchCredentialAudit = Boolean(
    credentialAddress &&
      credentialAddress !== "0x0000000000000000000000000000000000000000" &&
      selectedObject?.type === "station",
  );
  const { data: credentialAuditedChapter } = useScaffoldReadContract({
    contractName: "Auditor",
    functionName: "isAudited",
    args: [credentialAddress as `0x${string}`],
    query: {
      enabled: shouldFetchCredentialAudit,
    },
  });

  // Fetch sale module address from registry
  const { data: saleModuleAddress } = useReadContract({
    address: registryAddress as `0x${string}`,
    abi: [
      {
        type: "function",
        name: "modules",
        inputs: [{ name: "", type: "string" }],
        outputs: [{ name: "", type: "address" }],
        stateMutability: "view",
      },
    ] as const,
    functionName: "modules",
    args: ["sale"],
    query: {
      enabled: shouldFetchAbout,
    },
  });

  // Fetch audit status for sale module
  const saleAddress = saleModuleAddress as string | undefined;
  const shouldFetchSaleAudit = Boolean(
    saleAddress && saleAddress !== "0x0000000000000000000000000000000000000000" && selectedObject?.type === "station",
  );
  const { data: saleAuditedChapter } = useScaffoldReadContract({
    contractName: "Auditor",
    functionName: "isAudited",
    args: [saleAddress as `0x${string}`],
    query: {
      enabled: shouldFetchSaleAudit,
    },
  });

  // Fetch stake module address from registry
  const { data: stakeModuleAddress } = useReadContract({
    address: registryAddress as `0x${string}`,
    abi: [
      {
        type: "function",
        name: "modules",
        inputs: [{ name: "", type: "string" }],
        outputs: [{ name: "", type: "address" }],
        stateMutability: "view",
      },
    ] as const,
    functionName: "modules",
    args: ["stake"],
    query: {
      enabled: shouldFetchAbout,
    },
  });

  // Fetch audit status for stake module
  const stakeAddress = stakeModuleAddress as string | undefined;
  const shouldFetchStakeAudit = Boolean(
    stakeAddress && stakeAddress !== "0x0000000000000000000000000000000000000000" && selectedObject?.type === "station",
  );
  const { data: stakeAuditedChapter } = useScaffoldReadContract({
    contractName: "Auditor",
    functionName: "isAudited",
    args: [stakeAddress as `0x${string}`],
    query: {
      enabled: shouldFetchStakeAudit,
    },
  });

  // Get the base type for this sector's station (1-6)
  const { data: baseType } = useScaffoldReadContract({
    contractName: "Game",
    functionName: "getSectorBaseType" as any,
    args: [sectorIdBigInt] as any,
  });

  // Game logic hooks
  useVectorMatching({ sectorData, setSectorData, wsRef, sectorId, showDebug });
  useParticleCleanup({ particles, setParticles, setSectorData });

  // Handle initial object selection and fetch static data (pilot stats, station info)
  useEffect(() => {
    if (!selectedObject) {
      // Only clear if we actually had something selected before
      if (selectedDetails || clickPosition || adjustedBoxPosition || pilotStats) {
        setSelectedDetails(null);
        setClickPosition(null);
        setAdjustedBoxPosition(null);
        setPilotStats(null);
      }
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

            // Only use aboutName if it's not "(pending audit)" - otherwise fall back to sectorName
            const validAboutName = aboutName && aboutName !== "(pending audit)" ? aboutName : undefined;

            const stationDetails: StationDetails = {
              sectorId: sectorId || "unknown",
              ownerAddress: owner,
              registryAddress: registry,
              aboutAddress:
                aboutAddress && aboutAddress !== "0x0000000000000000000000000000000000000000"
                  ? aboutAddress
                  : undefined,
              aboutAuditedChapter: aboutAuditedChapter ? Number(aboutAuditedChapter) : undefined,
              credentialAddress:
                credentialAddress && credentialAddress !== "0x0000000000000000000000000000000000000000"
                  ? credentialAddress
                  : undefined,
              credentialAuditedChapter: credentialAuditedChapter ? Number(credentialAuditedChapter) : undefined,
              saleAddress:
                saleAddress && saleAddress !== "0x0000000000000000000000000000000000000000" ? saleAddress : undefined,
              saleAuditedChapter: saleAuditedChapter ? Number(saleAuditedChapter) : undefined,
              stakeAddress:
                stakeAddress && stakeAddress !== "0x0000000000000000000000000000000000000000"
                  ? stakeAddress
                  : undefined,
              stakeAuditedChapter: stakeAuditedChapter ? Number(stakeAuditedChapter) : undefined,
              stationName: validAboutName || sectorName,
              social: aboutSocial || undefined,
              score: playerScore !== undefined ? Number(playerScore) : 0,
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
    // Note: selectedDetails, clickPosition, adjustedBoxPosition, pilotStats are intentionally
    // omitted from dependencies to avoid infinite loops - they're only used in the conditional
    // check at the start, not as inputs to fetchDetails
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedObject,
    sectorId,
    sectorInfo,
    aboutInfo,
    auditedChapter,
    aboutAddress,
    aboutAuditedChapter,
    credentialAddress,
    credentialAuditedChapter,
    saleAddress,
    saleAuditedChapter,
    stakeAddress,
    stakeAuditedChapter,
    sectorName,
    sectorData,
  ]);

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

  // Handle radar activation (from modal)
  const handleRadarActivation = () => {
    console.log("🛰️ Activating sector radar...");

    // Unlock audio
    unlockAudio();

    // Play close sound to confirm activation (after a brief delay to ensure audio is unlocked)
    setTimeout(() => {
      if (soundEnabled) {
        playSound("close", 0.3);
      }
    }, 100);
  };

  // Handle object selection
  const handleObjectSelect = (object: SelectedObject | null) => {
    // Play close sound when deselecting (closing the UI)
    if (!object && selectedObject && soundEnabled) {
      playSound("close", 0.15);
    }
    setSelectedObject(object);
  };

  // Handle outside clicks to deselect
  const handlePageClick = () => {
    // Don't try to unlock audio via page clicks - user must use the radar activation modal
    // This prevents accidental unlocking when they just want to deselect an object

    if (selectedObject) {
      // Use handleObjectSelect to ensure sound is played
      handleObjectSelect(null);
    }
  };

  // Handle info box position adjustment (updates during dragging)
  const handlePositionAdjusted = (newPosition: Vector2D) => {
    setAdjustedBoxPosition(newPosition);
  };

  // Keyboard shortcuts for toggling grid, debug, targeting, and sound
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "g" || e.key === "G") {
        setShowGrid((prev: boolean) => !prev);
      } else if (e.key === "d" || e.key === "D") {
        setShowDebug((prev: boolean) => !prev);
      } else if (e.key === "t" || e.key === "T") {
        setShowTargeting((prev: boolean) => !prev);
      } else if (e.key === "s" || e.key === "S") {
        setSoundEnabled((prev: boolean) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  // Save preferences to localStorage when they change
  useEffect(() => {
    localStorage.setItem("showGrid", JSON.stringify(showGrid));
  }, [showGrid]);

  useEffect(() => {
    localStorage.setItem("showDebug", JSON.stringify(showDebug));
  }, [showDebug]);

  useEffect(() => {
    localStorage.setItem("showTargeting", JSON.stringify(showTargeting));
  }, [showTargeting]);

  useEffect(() => {
    localStorage.setItem("soundEnabled", JSON.stringify(soundEnabled));
  }, [soundEnabled]);

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

  // Cleanup: Clear mining tracking when component unmounts
  useEffect(() => {
    const miningSessions = miningShipsRef.current;
    return () => {
      miningSessions.clear();
    };
  }, []);

  // Watch for ping waves reaching the station and trigger rebroadcasts
  useEffect(() => {
    const stationPos = { x: SECTOR_CONFIG.WIDTH / 2, y: SECTOR_CONFIG.HEIGHT / 2 };

    // Use an interval to continuously check for pings reaching the station
    // Optimized: interval doesn't recreate on every particle change
    const checkInterval = setInterval(() => {
      const currentTime = Date.now();

      // Cleanup old rebroadcast tracking entries (memory leak fix)
      // Remove entries older than 3 seconds (pings are long gone by then)
      if (rebroadcastTimestampsRef.current.size > 0) {
        const expiredIds: string[] = [];
        rebroadcastTimestampsRef.current.forEach((timestamp, id) => {
          if (currentTime - timestamp > 3000) {
            expiredIds.push(id);
          }
        });
        expiredIds.forEach(id => {
          rebroadcastedPingsRef.current.delete(id);
          rebroadcastTimestampsRef.current.delete(id);
        });
      }

      // Debounce: Only rebroadcast once per second
      const timeSinceLastRebroadcast = currentTime - lastRebroadcastTimeRef.current;
      if (timeSinceLastRebroadcast < 1000) {
        return; // Too soon, skip this check
      }

      // Get current particles from state (access via closure)
      particles.forEach(particle => {
        // Only process original ping particles (not rebroadcasts) that haven't been rebroadcast yet
        if (!particle.pingEffect || particle.isRebroadcast || rebroadcastedPingsRef.current.has(particle.id)) {
          return;
        }

        const age = currentTime - particle.spawnTime;
        const ageRatio = age / particle.lifetime;

        // Only check if particle has started and is still alive (optimization: skip expired)
        if (age < 0 || ageRatio >= 1) {
          return;
        }

        // Calculate current ring radius (must match the visual expansion in SectorCanvas)
        const customExpansionSpeed = particle.expansionSpeed || 30;
        const expansionFactor = 1 + ageRatio * customExpansionSpeed;
        const ringRadius = particle.size * expansionFactor;

        // Calculate distance from ping origin to station
        const dx = particle.position.x - stationPos.x;
        const dy = particle.position.y - stationPos.y;
        const distanceToStation = Math.sqrt(dx * dx + dy * dy);

        // Check if the expanding ring has reached the station (within a threshold)
        // Increased threshold to 80 pixels for more reliable detection
        const threshold = 80;
        if (Math.abs(ringRadius - distanceToStation) < threshold) {
          // Mark this ping as rebroadcast with timestamp for cleanup
          rebroadcastedPingsRef.current.add(particle.id);
          rebroadcastTimestampsRef.current.set(particle.id, currentTime);
          lastRebroadcastTimeRef.current = currentTime;

          console.log(
            `🛰️ Station rebroadcasting ping from ${particle.color.includes("150, 200") ? "asteroid" : "ship"}`,
          );

          // Create white rebroadcast ping from the station
          // Station broadcasts: MUCH SLOWER expansion (6 vs 30) but SHORTER lifetime (1000ms vs 2200ms)
          // This creates a "long-range broadcast" feel - slow moving waves that fade quickly
          const rebroadcastPings = createPingParticles(
            stationPos,
            "rgba(255, 255, 255, 0.4)", // White color for station rebroadcast (more transparent)
            particle.pingThickness || 1.0, // Use same thickness as original ping
            true, // Mark as rebroadcast so it doesn't retrigger
            6, // Much slower expansion speed - only 20% the speed of ships/asteroids (6 vs 30)
            1000, // Much shorter lifetime - fades quickly (vs 2200ms for ships/asteroids)
          );

          setParticles(prev => {
            // Safety limit: cap total particles at 200 to prevent performance issues
            const combined = [...prev, ...rebroadcastPings];
            if (combined.length > 200) {
              // Keep newest particles (at the end of array)
              return combined.slice(-200);
            }
            return combined;
          });

          // Optional: Play a subtle rebroadcast sound
          if (soundEnabled) {
            playSound("accept", 0.5);
          }
        }
      });
    }, 50); // Check every 50ms for better detection

    return () => clearInterval(checkInterval);
  }, [particles, soundEnabled, playSound, setParticles]);

  // Watch for base type changes and play upgrade sounds + particles
  useEffect(() => {
    if (!baseType) return;

    const currentBaseType = Number(baseType);

    // Initialize previous base type on first render
    if (previousBaseTypeRef.current === null) {
      previousBaseTypeRef.current = currentBaseType;
      return;
    }

    const previousBaseType = previousBaseTypeRef.current;

    // Detect upgrades and play appropriate sound + create particles
    if (currentBaseType > previousBaseType) {
      // Base upgraded!
      if (previousBaseType === 1 && currentBaseType === 2) {
        console.log("🎉 Station upgraded from base 1 to base 2!");
        if (soundEnabled) {
          playSound("upgrade1", 0.6);
        }
        // Create blue magic dust particles at station (center of map)
        const stationPos = { x: SECTOR_CONFIG.WIDTH / 2, y: SECTOR_CONFIG.HEIGHT / 2 };
        const upgradeParticles = createBaseUpgradeParticles(stationPos);
        setParticles(prev => {
          const combined = [...prev, ...upgradeParticles];
          return combined.length > 200 ? combined.slice(-200) : combined;
        });
      } else if (previousBaseType === 2 && currentBaseType === 3) {
        console.log("🎉 Station upgraded from base 2 to base 3!");
        if (soundEnabled) {
          playSound("upgrade2", 0.6);
        }
        // Create blue magic dust particles at station (center of map)
        const stationPos = { x: SECTOR_CONFIG.WIDTH / 2, y: SECTOR_CONFIG.HEIGHT / 2 };
        const upgradeParticles = createBaseUpgradeParticles(stationPos);
        setParticles(prev => {
          const combined = [...prev, ...upgradeParticles];
          return combined.length > 200 ? combined.slice(-200) : combined;
        });
      } else if (previousBaseType === 3 && currentBaseType === 4) {
        console.log("🎉 Station upgraded from base 3 to base 4!");
        if (soundEnabled) {
          playSound("upgrade3", 0.6);
        }
        // Create blue magic dust particles at station (center of map)
        const stationPos = { x: SECTOR_CONFIG.WIDTH / 2, y: SECTOR_CONFIG.HEIGHT / 2 };
        const upgradeParticles = createBaseUpgradeParticles(stationPos);
        setParticles(prev => {
          const combined = [...prev, ...upgradeParticles];
          return combined.length > 200 ? combined.slice(-200) : combined;
        });
      } else if (previousBaseType === 4 && currentBaseType === 5) {
        console.log("🎉 Station upgraded from base 4 to base 5! (Crowdsale Complete)");
        if (soundEnabled) {
          playSound("upgrade3", 0.6);
        }
        // Create blue magic dust particles at station (center of map)
        const stationPos = { x: SECTOR_CONFIG.WIDTH / 2, y: SECTOR_CONFIG.HEIGHT / 2 };
        const upgradeParticles = createBaseUpgradeParticles(stationPos);
        setParticles(prev => {
          const combined = [...prev, ...upgradeParticles];
          return combined.length > 200 ? combined.slice(-200) : combined;
        });
      }
    }

    // Update the ref to the current base type
    previousBaseTypeRef.current = currentBaseType;
  }, [baseType, soundEnabled, playSound, setParticles]);

  // Note: Audio confirmation sound is played in handleRadarActivation()
  // when the user clicks "ACTIVATE SECTOR RADAR" button

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Link href="/" className="btn btn-sm btn-ghost mb-4">
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Home
        </Link>
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body items-center text-center">
            <div className="text-4xl mb-4 animate-pulse">🛰️</div>
            <h3 className="text-lg font-semibold">
              Searching for a signal from sector {sectorId ? `${sectorId.slice(0, 12)}` : ""}
              <span className="inline-flex">
                <span className="animate-[bounce_1s_ease-in-out_0s_infinite]">.</span>
                <span className="animate-[bounce_1s_ease-in-out_0.2s_infinite]">.</span>
                <span className="animate-[bounce_1s_ease-in-out_0.4s_infinite]">.</span>
              </span>
            </h3>
            {countdown !== null && (
              <div className="mt-2 text-sm opacity-60">
                Retrying in {countdown} second{countdown !== 1 ? "s" : ""}
              </div>
            )}
            <progress className="progress progress-primary w-56 mt-4"></progress>
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
      {/* Radar Activation Modal - Shows when sounds enabled but audio not unlocked */}
      {soundEnabled && !audioUnlocked && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95">
          <div className="relative w-full max-w-2xl mx-4">
            {/* Video Container */}
            <div className="relative rounded-lg overflow-hidden shadow-2xl border-4 border-yellow-500/50">
              <video
                key="radar-video"
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-auto"
                style={{ opacity: 1, transition: "none" }}
              >
                <source src="/radargirl.mp4" type="video/mp4" />
              </video>

              {/* Overlay gradient for better button visibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

              {/* Activation Button */}
              <div className="absolute bottom-8 left-0 right-0 flex justify-center">
                <button
                  onClick={handleRadarActivation}
                  className="btn btn-lg bg-yellow-500 hover:bg-yellow-400 text-black font-bold border-none shadow-2xl px-8 py-4 text-xl animate-pulse hover:scale-110 transition-transform"
                  style={{ textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}
                >
                  🛰️ ACTIVATE SECTOR RADAR
                </button>
              </div>
            </div>

            {/* Sector ID Display */}
            <div className="mt-4 text-center text-yellow-500 font-mono text-sm opacity-75">
              SECTOR: {sectorId ? sectorId.slice(0, 16) : "UNKNOWN"}...
            </div>
          </div>
        </div>
      )}

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
          <h1 className="text-xl font-bold">Sector {sectorId ? `${sectorId.slice(0, 8)}...` : "Unknown"}</h1>
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
            baseType={baseType ? Number(baseType) : 1}
            soundEnabled={soundEnabled}
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
            {" • "}
            <span style={{ opacity: soundEnabled ? 1 : 0.77 }}>
              <kbd className="kbd kbd-xs">S</kbd> Sound
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
          onClose={() => handleObjectSelect(null)}
          data={selectedDetails}
          isLoading={isLoadingDetails}
          onPositionAdjusted={handlePositionAdjusted}
        />
      )}
    </div>
  );
};

export default SectorPage;
