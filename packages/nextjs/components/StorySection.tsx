import { ReactNode } from "react";

interface StorySectionProps {
  children?: ReactNode;
}

export const StorySection = ({ children }: StorySectionProps) => {
  return (
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
            only to have another swoop in and take everything. No treaties held. Anarchy ruled, but it squandered more
            than it gave. No one trusted anyone, and every mission risked ending in blood or bankruptcy. Max didn&apos;t
            try to stop the violence, only the inefficiency.
          </p>
          <p className="text-lg leading-relaxed px-4">
            From a forgotten outpost barely clinging to gravity, Max deployed the first shared record—an immutable
            contract that let pirates stake exclusive claims on asteroids, earn daily fuel credits, and register their
            word with something stronger than talk. To dock in the garage, you needed a credential: proof that you
            bought in, agreed not to fire first, and played by the rules. Every deal made or broken left a trace in the
            record. Build a good rep, and you could refuel in peace. Break too many promises, and the record made you
            open season. Over time, the chaos thinned. Crews stopped clashing over the same rocks. Refueling stations
            stayed intact. Loot got bigger, not bloodier.
          </p>
        </div>

        {/* Additional content can be passed as children */}
        {children}
      </div>
    </div>
  );
};
