"use client";

import { useState } from "react";
import { Chapter0, Chapter1, Chapter2, Chapter3, Chapter4, Chapter5 } from "./chapters";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

// Map chapter numbers to their components and titles
const chapterComponents: Record<number, { component: React.ComponentType; title: string }> = {
  0: { component: Chapter0, title: "Chapter 0: The Protocol" },
  1: { component: Chapter1, title: "Chapter 1: The Signal" },
  2: { component: Chapter2, title: "Chapter 2: The Announcement (and Audit)" },
  3: { component: Chapter3, title: "Chapter 3: The Credential" },
  4: { component: Chapter4, title: "Chapter 4: The Staking (and Slashing)" },
  5: { component: Chapter5, title: "Chapter 5: The Crowdsale" },
};

const CollapsibleChapter = ({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-base-300 rounded-3xl overflow-hidden mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 hover:bg-base-200 transition-colors"
      >
        <h2 className="text-2xl font-bold text-primary">{title}</h2>
        {isOpen ? (
          <ChevronUpIcon className="h-6 w-6 text-primary flex-shrink-0" />
        ) : (
          <ChevronDownIcon className="h-6 w-6 text-primary flex-shrink-0" />
        )}
      </button>
      {isOpen && <div className="px-8 pb-8">{children}</div>}
    </div>
  );
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
        <CollapsibleChapter title="Chapter 0: The Protocol" defaultOpen={true}>
          <Chapter0 />
        </CollapsibleChapter>
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
      {/* Chapter 0 is always visible and open by default */}
      <CollapsibleChapter title="Chapter 0: The Protocol" defaultOpen={true}>
        <Chapter0 />
      </CollapsibleChapter>

      {sortedChapters.length === 0 ? (
        <div className="bg-base-300 rounded-3xl p-6 mb-6">
          <div className="text-center opacity-70">
            <h3 className="text-xl font-bold mb-2">📚 No Additional Chapters Available</h3>
            <p>More chapters will appear here as they are unlocked.</p>
          </div>
        </div>
      ) : (
        sortedChapters.map(chapterNumber => {
          const chapterData = chapterComponents[chapterNumber];

          if (!chapterData || !chapterData.component) {
            return (
              <div key={chapterNumber} className="bg-base-300 rounded-3xl p-6">
                <div className="text-center opacity-70">
                  <h3 className="text-xl font-bold mb-2">📖 Chapter {chapterNumber}</h3>
                  <p>This chapter is coming soon...</p>
                </div>
              </div>
            );
          }

          const ChapterComponent = chapterData.component;

          return (
            <CollapsibleChapter key={chapterNumber} title={chapterData.title} defaultOpen={true}>
              <ChapterComponent />
            </CollapsibleChapter>
          );
        })
      )}
    </div>
  );
};
