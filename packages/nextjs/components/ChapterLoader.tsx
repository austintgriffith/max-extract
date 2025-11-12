"use client";

import { Chapter0, Chapter1, Chapter2, Chapter3, Chapter4, Chapter5 } from "./chapters";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

// Map chapter numbers to their components
const chapterComponents: Record<number, React.ComponentType> = {
  0: Chapter0,
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
      <div className="space-y-6">
        {/* Chapter 0 is always visible */}
        <Chapter0 />
        <div className="bg-base-300 rounded-3xl p-6 mb-6">
          <div className="flex items-center justify-center">
            <span className="loading loading-spinner loading-md mr-2"></span>
            Loading chapters...
          </div>
        </div>
      </div>
    );
  }

  // Sort chapters in ascending order, excluding chapter 0 which is always shown
  const sortedChapters = visibleChapters ? [...visibleChapters].filter(n => n !== 0).sort((a, b) => a - b) : [];

  return (
    <div className="space-y-6">
      {/* Chapter 0 is always visible */}
      <Chapter0 />

      {sortedChapters.length === 0 ? (
        <div className="bg-base-300 rounded-3xl p-6 mb-6">
          <div className="text-center opacity-70">
            <h3 className="text-xl font-bold mb-2">📚 No Additional Chapters Available</h3>
            <p>More chapters will appear here as they are unlocked.</p>
          </div>
        </div>
      ) : (
        sortedChapters.map(chapterNumber => {
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
        })
      )}
    </div>
  );
};
