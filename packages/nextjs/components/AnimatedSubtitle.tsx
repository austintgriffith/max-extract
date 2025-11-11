"use client";

import { useEffect, useState } from "react";

interface FloatingChar {
  id: string;
  char: string;
  x: number;
  y: number;
  lineType: "top" | "middle" | "bottom";
}

export const AnimatedSubtitle = () => {
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
  const [floatingChars, setFloatingChars] = useState<FloatingChar[]>([]);

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
        const floatingId = `${charKey}-${Date.now()}`;
        setFloatingChars(prev => [
          ...prev,
          {
            id: floatingId,
            char: hexChar,
            x: containerRect.left,
            y: containerRect.top,
            lineType,
          },
        ]);

        // Remove this specific floating character after animation completes
        setTimeout(() => {
          setFloatingChars(prev => prev.filter(char => char.id !== floatingId));
        }, 8000); // 8s animation duration

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

  // No longer need this cleanup effect - characters are now cleaned up individually

  return (
    <div className="relative -mt-6 mb-8 z-10 overflow-visible w-full">
      <div
        className="text-sm md:text-base lg:text-lg text-white font-medium relative"
        style={{
          fontFamily: '"Tektur", "Share Tech Mono", monospace',
          height: "6rem",
          width: `${totalWidth * 0.575}rem`,
          left: "50%",
          transform: "translateX(-50%)",
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
  );
};
