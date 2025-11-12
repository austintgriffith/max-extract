import { useEffect } from "react";
import Image from "next/image";

interface MaintenanceModeProps {
  message: string;
}

/**
 * Maintenance Mode Component
 * Displays a centered GIF and maintenance message
 * Automatically reloads the page every 20 seconds to check if maintenance is complete
 */
export const MaintenanceMode = ({ message }: MaintenanceModeProps) => {
  useEffect(() => {
    // Set up hard reload every 20 seconds
    const reloadInterval = setInterval(() => {
      window.location.reload();
    }, 20000); // 20 seconds

    // Cleanup interval on component unmount
    return () => clearInterval(reloadInterval);
  }, []);

  return (
    <div className="flex items-center justify-center flex-col min-h-screen bg-black">
      {/* Main Content Container */}
      <div className="flex flex-col items-center justify-center gap-8 p-8">
        {/* Title Message */}
        <h1
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white text-center tracking-wider max-w-4xl"
          style={{
            textShadow:
              "0 0 20px rgba(255, 165, 0, 0.8), 0 0 40px rgba(255, 165, 0, 0.6), 0 0 60px rgba(255, 165, 0, 0.4), 4px 4px 8px rgba(0, 0, 0, 0.8)",
            filter: "drop-shadow(0 0 10px rgba(255, 165, 0, 0.5))",
          }}
        >
          {message}
        </h1>

        {/* Centered GIF */}
        <div className="flex items-center justify-center">
          <Image
            src="/maxflying.gif"
            alt="Max Flying"
            width={400}
            height={400}
            className="rounded-lg shadow-2xl"
            priority
            unoptimized // Important for GIFs to animate properly
          />
        </div>

        {/* Auto-reload indicator */}
        <div className="text-center text-gray-400 text-sm">
          <p>This page will automatically reload every 20 seconds...</p>
        </div>
      </div>
    </div>
  );
};
