"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const [gameServerStatus, setGameServerStatus] = useState<"checking" | "online" | "offline">("checking");

  // Animation state for the subtitle
  const coreText = "Extraction_Protocol_on_Ethereum";
  const totalWidth = 178; // Total characters across the screen (3x padding)
  const startPos = Math.floor((totalWidth - coreText.length) / 2); // Center the core text

  // Create full line with underscores and core text
  const createFullLine = () => {
    const line = new Array(totalWidth).fill("_");
    for (let i = 0; i < coreText.length; i++) {
      line[startPos + i] = coreText[i];
    }
    return line.join("");
  };

  const fullLine = createFullLine();
  const [animatedChars, setAnimatedChars] = useState<{ [key: string]: string }>({});
  const [extractionCounter, setExtractionCounter] = useState(0);
  const [floatingChars, setFloatingChars] = useState<
    Array<{
      id: string;
      char: string;
      x: number;
      y: number;
      lineType: "top" | "middle" | "bottom";
    }>
  >([]);

  // Read active sectors from the MaxExtract contract
  const { data: activeSectors } = useScaffoldReadContract({
    contractName: "MaxExtract",
    functionName: "getActiveSectors",
  });

  // Hex animation effect for full line with underscores
  useEffect(() => {
    const hexChars = "0123456789ABCDEF";

    const animateCharacter = () => {
      // Include all characters (letters and underscores) for animation
      const validIndices = [];
      for (let i = 0; i < fullLine.length; i++) {
        validIndices.push(i);
      }

      const randomIndex = validIndices[Math.floor(Math.random() * validIndices.length)];
      const originalChar = fullLine[randomIndex];

      // Special logic for "Extraction" -> "0xtraction" (every third time we hit 'E' at start of core text)
      let hexChar;
      if (randomIndex === startPos && originalChar === "E" && extractionCounter % 3 === 0) {
        // Replace "E" with "0" to make "0xtraction"
        hexChar = "0";
      } else {
        hexChar = hexChars[Math.floor(Math.random() * hexChars.length)];
      }

      // Update counter for Extraction -> 0xtraction logic
      if (randomIndex === startPos && originalChar === "E") {
        setExtractionCounter(prev => prev + 1);
      }

      // Set the hex character at specific position (can be top, middle, or bottom line)
      const lineType = Math.random() < 0.333 ? "top" : Math.random() < 0.666 ? "middle" : "bottom";
      const charKey =
        lineType === "bottom" ? `bottom-${randomIndex}` : lineType === "top" ? `top-${randomIndex}` : randomIndex;

      setAnimatedChars(prev => ({
        ...prev,
        [charKey]: hexChar,
      }));

      // Restore original character after 200ms and create floating effect
      setTimeout(() => {
        // Calculate position for floating character
        const charWidth = 0.575; // rem
        const lineHeight = 2; // rem
        const baseY = lineType === "top" ? 0 : lineType === "middle" ? 2 : 4;

        // Get the container position (relative to the animated text container)
        const containerRect = {
          left: randomIndex * charWidth,
          top: baseY,
          width: charWidth,
          height: lineHeight,
        };

        // Add floating character before removing from animated chars
        setFloatingChars(prev => [
          ...prev,
          {
            id: `${charKey}-${Date.now()}`,
            char: hexChar,
            x: containerRect.left,
            y: containerRect.top,
            lineType,
          },
        ]);

        // Remove from animated characters
        setAnimatedChars(prev => {
          const newChars = { ...prev };
          delete newChars[charKey];
          return newChars;
        });
      }, 200);
    };

    const interval = setInterval(animateCharacter, 50);

    return () => clearInterval(interval);
  }, [fullLine, extractionCounter, startPos]);

  // Clean up floating characters after animation completes
  useEffect(() => {
    if (floatingChars.length === 0) return;

    const cleanup = setTimeout(() => {
      setFloatingChars([]);
    }, 8200); // 200ms display + 8000ms animation

    return () => clearTimeout(cleanup);
  }, [floatingChars]);

  // Check game server status
  useEffect(() => {
    const checkGameServer = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/health");
        if (response.ok) {
          setGameServerStatus("online");
        } else {
          setGameServerStatus("offline");
        }
      } catch {
        setGameServerStatus("offline");
      }
    };

    checkGameServer();
    const interval = setInterval(checkGameServer, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <div className="flex items-center flex-col grow">
        {/* Hero Image - Full Width with Bleed */}
        <div className="w-full -mx-10 relative">
          <Image
            src="/maxwidenotext.jpg"
            alt="Max Extract"
            width={1200}
            height={800}
            className="w-[calc(100%+80px)] rounded-lg shadow-2xl"
            priority
          />
          {/* Floating Title Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-start pt-8 sm:pt-12 md:pt-16 lg:pt-24">
            <h1
              className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-white text-center tracking-wider"
              style={{
                textShadow:
                  "0 0 20px rgba(255, 165, 0, 0.8), 0 0 40px rgba(255, 165, 0, 0.6), 0 0 60px rgba(255, 165, 0, 0.4), 4px 4px 8px rgba(0, 0, 0, 0.8)",
                filter: "drop-shadow(0 0 10px rgba(255, 165, 0, 0.5))",
                transform: "scaleY(1.2)",
              }}
            >
              MAX EXTRACT
            </h1>
          </div>
        </div>

        {/* Animated Subtitle with Underscores - Positioned between hero and background */}
        <div className="relative flex justify-center -mt-6 mb-8 z-10">
          <div
            className="text-sm md:text-base lg:text-lg text-white font-medium relative"
            style={{
              fontFamily: '"Tektur", "Share Tech Mono", monospace',
              height: "6rem",
              width: `${totalWidth * 0.575}rem`,
            }}
          >
            {/* Top line with animated underscores */}
            {fullLine.split("").map((char, index) => (
              <span
                key={`top-${index}`}
                className="absolute inline-block"
                style={{
                  left: `${index * 0.575}rem`,
                  top: 0,
                  width: "0.575rem",
                  textAlign: "center",
                  opacity: 0.7,
                }}
              >
                {animatedChars[`top-${index}`] || "_"}
              </span>
            ))}
            {/* Middle line with animated text */}
            {fullLine.split("").map((char, index) => (
              <span
                key={index}
                className="absolute inline-block"
                style={{
                  left: `${index * 0.575}rem`,
                  top: "2rem",
                  width: "0.575rem",
                  textAlign: "center",
                }}
              >
                {animatedChars[index] || char}
              </span>
            ))}
            {/* Bottom line with animated underscores */}
            {fullLine.split("").map((char, index) => (
              <span
                key={`bottom-${index}`}
                className="absolute inline-block"
                style={{
                  left: `${index * 0.575}rem`,
                  top: "4rem",
                  width: "0.575rem",
                  textAlign: "center",
                  opacity: 0.7,
                }}
              >
                {animatedChars[`bottom-${index}`] || "_"}
              </span>
            ))}

            {/* Floating Characters */}
            {floatingChars.map(floatingChar => (
              <div
                key={floatingChar.id}
                className="absolute inline-block pointer-events-none z-10"
                style={{
                  left: `${floatingChar.x}rem`,
                  top: `${floatingChar.y}rem`,
                  width: "0.575rem",
                  textAlign: "center",
                  fontFamily: '"Tektur", "Share Tech Mono", monospace',
                  color: "white",
                  fontSize: "1rem",
                  animation: "floatDown 8s ease-out forwards, fadeOut 8s ease-out forwards",
                }}
              >
                {floatingChar.char}
              </div>
            ))}
          </div>
        </div>

        {/* Background Image Section */}
        <div
          className="w-full relative -mt-[110px]"
          style={{
            backgroundImage: "url(/background3.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          {/* Overlay to ensure text readability */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"></div>

          {/* Content */}
          <div className="relative px-5 max-w-6xl mx-auto">
            {/* Story Text */}
            <div className="prose prose-lg max-w-none text-base-content mb-8 px-8 py-6 mt-24">
              <p className="text-lg leading-relaxed mb-8 px-4">
                Max Extract wasn&apos;t a captain or a warlord. Just another code monkey in the asteroid belt, known for
                keeping his head down and drill spinning. Out here, among scattered wrecks and drifting cargo, the real
                battles weren&apos;t fought with lasers—they were waged in silence, when one crew mined a rock for hours
                only to have another swoop in and take everything. No treaties held. Anarchy ruled, but it squandered
                more than it gave. No one trusted anyone, and every mission risked ending in blood or bankruptcy. Max
                didn&apos;t try to stop the violence, only the inefficiency.
              </p>
              <p className="text-lg leading-relaxed px-4">
                From a forgotten outpost barely clinging to gravity, Max deployed the first shared record—an immutable
                contract that let pirates stake exclusive claims on asteroids, earn daily fuel credits, and register
                their word with something stronger than talk. To dock in the garage, you needed a credential: proof that
                you bought in, agreed not to fire first, and played by the rules. Every deal made or broken left a trace
                in the record. Build a good rep, and you could refuel in peace. Break too many promises, and the record
                made you open season. Over time, the chaos thinned. Crews stopped clashing over the same rocks.
                Refueling stations stayed intact. Loot got bigger, not bloodier.
              </p>
            </div>

            {/* Active Sectors */}
            {activeSectors && activeSectors.length > 0 && (
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold mb-4">🚀 Active Sectors</h2>
                <div className="flex flex-wrap justify-center gap-2">
                  {activeSectors.map((sectorId: bigint) => (
                    <Link
                      key={sectorId.toString()}
                      href={`/sector/${sectorId.toString()}`}
                      className="btn btn-primary btn-sm"
                    >
                      Sector {sectorId.toString().slice(0, 8)}...
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grow bg-base-300 w-full mt-16 px-8 py-12">
          {/* Connection Status */}
          <div className="bg-base-200 rounded-lg p-6 mb-8 max-w-md mx-auto">
            <div className="flex justify-center items-center space-x-2 flex-col mb-4">
              <p className="font-medium">Connected Address:</p>
              <Address address={connectedAddress} />
            </div>

            <div className="text-center">
              <div
                className={`badge ${
                  gameServerStatus === "online"
                    ? "badge-success"
                    : gameServerStatus === "checking"
                      ? "badge-warning"
                      : "badge-error"
                }`}
              >
                Game Server: {gameServerStatus}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
