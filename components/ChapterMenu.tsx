import React from 'react';
import { Chapter, Summary } from '../types';
import { CheckCircleIcon } from './Icons';

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
  return (
    <nav className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-1">
      {chapters.map((chapter, originalIndex) => {
        // Skip null chapters but preserve original indices
        if (chapter === null || chapter === undefined) return null;

        const isSummarized = summarizedChapters[originalIndex] !== undefined;
        const isProcessing = processingChapterIndex === originalIndex;
        const isSelected = originalIndex === selectedIndex;

        return (
          <button
            key={originalIndex}
            onClick={() => onSelectChapter(originalIndex)}
            className={`w-full text-left flex items-center p-3 text-sm font-medium rounded-md transition-colors duration-150 ${
              isSelected
                ? 'bg-gradient-to-r from-amber-600/30 to-orange-600/30 text-amber-100 border-l-2 border-amber-500'
                : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
            }`}
          >
            <span className="flex-1 truncate">{chapter.title}</span>
            <div className="ml-3 w-5 h-5 flex-shrink-0 flex items-center justify-center">
                {isProcessing ? (
                    <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                ) : isSummarized ? (
                    <CheckCircleIcon className="w-5 h-5 text-amber-500" />
                ) : null}
            </div>
          </button>
        );
      })}
    </nav>
  );
};

export default ChapterMenu;