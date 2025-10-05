import Image from "next/image";

export const HeroSection = () => {
  return (
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
  );
};
