"use client";

import { Chapter1, Chapter2, Chapter3, Chapter4, Chapter5 } from "./chapters";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

// Map chapter numbers to their components
const chapterComponents: Record<number, React.ComponentType> = {
  1: Chapter1,
  2: Chapter2,
  3: Chapter3,
  4: Chapter4,
  5: Chapter5,
};

export const ChapterLoader = () => {
  // Read visible chapters from the Game contract
  const { data: visibleChapters, isLoading } = useScaffoldReadContract({
    contractName: "Game",
    functionName: "getVisibleChapters",
  });

  if (isLoading) {
    return (
      <div className="bg-base-300 rounded-3xl p-6 mb-6">
        <div className="flex items-center justify-center">
          <span className="loading loading-spinner loading-md mr-2"></span>
          Loading chapters...
        </div>
      </div>
    );
  }

  if (!visibleChapters || visibleChapters.length === 0) {
    return (
      <div className="bg-base-300 rounded-3xl p-6 mb-6">
        <div className="text-center opacity-70">
          <h3 className="text-xl font-bold mb-2">📚 No Chapters Available</h3>
          <p>Chapters will appear here as they are unlocked.</p>
        </div>
      </div>
    );
  }

  // Sort chapters in ascending order
  const sortedChapters = [...visibleChapters].sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      {sortedChapters.map(chapterNumber => {
        const ChapterComponent = chapterComponents[chapterNumber];

        if (!ChapterComponent) {
          return (
            <div key={chapterNumber} className="bg-base-300 rounded-3xl p-6">
              <div className="text-center opacity-70">
                <h3 className="text-xl font-bold mb-2">📖 Chapter {chapterNumber}</h3>
                <p>This chapter is coming soon...</p>
              </div>
            </div>
          );
        }

        return <ChapterComponent key={chapterNumber} />;
      })}
    </div>
  );
};
