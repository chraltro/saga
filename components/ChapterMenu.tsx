import React from 'react';
import { Chapter, Summary } from '../types';

interface ChapterMenuProps {
  chapters: Chapter[];
  summarizedChapters: Record<number, Summary>;
  selectedIndex: number;
  onSelectChapter: (index: number) => void;
  processingChapterIndex: number | null;
}

const ChapterMenu: React.FC<ChapterMenuProps> = ({
  chapters,
  summarizedChapters,
  selectedIndex,
  onSelectChapter,
  processingChapterIndex
}) => {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const buttonRefs = React.useRef<Record<number, HTMLButtonElement | null>>({});

  return (
    <nav className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-1">
      {chapters.map((chapter, originalIndex) => {
        // Skip null chapters but preserve original indices
        if (chapter === null || chapter === undefined) return null;

        const isSummarized = summarizedChapters[originalIndex] !== undefined;
        const isProcessing = processingChapterIndex === originalIndex;
        const isSelected = originalIndex === selectedIndex;
        const summary = summarizedChapters[originalIndex];
        const firstBullet = summary?.bullets?.[0];
        const isHovered = hoveredIndex === originalIndex;

        return (
          <div key={originalIndex} className="relative">
            <button
              ref={(el) => { buttonRefs.current[originalIndex] = el; }}
              onClick={() => onSelectChapter(originalIndex)}
              onMouseEnter={() => setHoveredIndex(originalIndex)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`w-full text-left flex items-center p-3 text-sm font-medium rounded-md transition-colors duration-150 ${
                isSelected
                  ? 'bg-gradient-to-r from-amber-600/30 to-orange-600/30 text-amber-100 border-l-2 border-amber-500'
                  : isSummarized
                  ? 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                  : 'text-gray-500 hover:bg-gray-700/50 hover:text-white'
              }`}
            >
              <span className="flex-1 truncate">{chapter.title}</span>
              {isProcessing && (
                <div className="ml-3 w-5 h-5 flex-shrink-0 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </button>

            {/* Hover tooltip with first summary bullet - using fixed positioning */}
            {firstBullet && isHovered && buttonRefs.current[originalIndex] && (() => {
              const rect = buttonRefs.current[originalIndex]!.getBoundingClientRect();

              return (
                <div
                  className="fixed pointer-events-none z-[9999]"
                  style={{
                    left: `${rect.right + 8}px`,
                    top: `${rect.top + rect.height / 2}px`,
                    transform: 'translateY(-50%)'
                  }}
                >
                  <div className="chapter-tooltip bg-gray-800 border border-amber-500/30 rounded-lg shadow-xl p-3 min-w-[250px] max-w-[500px] max-h-[70vh] overflow-y-auto">
                    <div className="text-xs text-amber-400 font-semibold mb-1">Quick Preview</div>
                    <div className="text-sm text-gray-200 leading-relaxed">
                      {firstBullet}
                    </div>
                    {/* Arrow pointer */}
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-gray-800"></div>
                  </div>
                </div>
              );
            })()}
          </div>
        );
      })}
    </nav>
  );
};

export default ChapterMenu;