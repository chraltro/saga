import React, { useState } from 'react';
import { Chapter, Summary } from '../types';
import { QuoteIcon, ListIcon, ImageIcon, FileTextIcon } from './Icons';
import Loader from './Loader';

interface SummaryDisplayProps {
  chapter: Chapter | undefined;
  summary: Summary | undefined;
  isProcessing: boolean;
  onPreviousChapter?: () => void;
  onNextChapter?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

const SummaryDisplay: React.FC<SummaryDisplayProps> = ({
  chapter,
  summary,
  isProcessing,
  onPreviousChapter,
  onNextChapter,
  hasPrevious,
  hasNext
}) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans' | 'mono'>('serif');
  const [showControls, setShowControls] = useState(false);

  if (!chapter) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400">Select a chapter to view its summary.</p>
      </div>
    );
  }

  const hasContent = summary && (summary.bullets.length > 0 || summary.quote);

  const fontSizeClasses = {
    small: 'text-sm md:text-base',
    medium: 'text-base md:text-lg',
    large: 'text-lg md:text-xl'
  };

  const fontFamilyClasses = {
    serif: 'font-serif',
    sans: 'font-sans',
    mono: 'font-mono'
  };

  const themeClasses = {
    light: 'bg-gray-100 text-gray-900',
    dark: 'bg-gray-800/50 text-gray-300'
  };

  return (
    <div className="max-w-4xl mx-auto relative">
      {/* Navigation Buttons - Mobile Only */}
      {hasPrevious && onPreviousChapter && (
        <button
          onClick={onPreviousChapter}
          className="md:hidden fixed bottom-6 left-4 z-40 w-12 h-12 bg-gray-800/90 hover:bg-gray-700 text-amber-400 rounded-full shadow-lg flex items-center justify-center transition-all"
          aria-label="Previous Chapter"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {hasNext && onNextChapter && (
        <button
          onClick={onNextChapter}
          className="md:hidden fixed bottom-6 right-4 z-40 w-12 h-12 bg-gray-800/90 hover:bg-gray-700 text-amber-400 rounded-full shadow-lg flex items-center justify-center transition-all"
          aria-label="Next Chapter"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      <h2 className="text-2xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 tracking-tight mb-4 pb-4 border-b-2 border-amber-900/30">
        {chapter.title}
      </h2>
      
      {!hasContent && isProcessing && (
         <div className="text-center bg-gray-800/50 p-12 rounded-lg mt-8">
            <Loader />
            <p className="text-lg text-gray-400 mt-4">
                Generating summary...
            </p>
        </div>
      )}

      {!hasContent && !isProcessing && (
         <div className="text-center bg-gray-800/50 p-12 rounded-lg mt-8">
            <p className="text-lg text-gray-400 mt-4">
                This chapter has not been summarized yet.
            </p>
            <p className="text-sm text-gray-500">
                Click its title in the sidebar to generate a summary.
            </p>
        </div>
      )}

      {hasContent && (
        <div className="space-y-12 animate-fade-in">
          {summary.bullets.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <ListIcon className="w-6 h-6 md:w-7 md:h-7 text-amber-400" />
                <h3 className="text-xl md:text-2xl font-bold text-amber-100">Summary</h3>
              </div>
              <ul className="space-y-3 list-disc list-inside text-base md:text-lg text-gray-300 pl-2">
                {summary.bullets.map((bullet, index) => (
                  <li key={index} className="leading-relaxed">{bullet}</li>
                ))}
              </ul>
            </div>
          )}
          
          {summary.quote && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <QuoteIcon className="w-6 h-6 md:w-7 md:h-7 text-amber-400" />
                <h3 className="text-xl md:text-2xl font-bold text-amber-100">Key Quote</h3>
              </div>
              <blockquote className="relative p-4 md:p-6 bg-gradient-to-r from-amber-900/20 to-orange-900/20 border-l-4 border-amber-500 rounded-r-lg">
                <p className="text-base md:text-xl italic text-amber-50 leading-relaxed">
                  {summary.quote}
                </p>
              </blockquote>
            </div>
          )}
        </div>
      )}


      <div className="mt-8 md:mt-12 pt-6 md:pt-8 border-t-2 border-amber-900/30">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <FileTextIcon className="w-6 h-6 md:w-7 md:h-7 text-amber-400" />
            <h3 className="text-xl md:text-2xl font-bold text-amber-100">Full Chapter Text</h3>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsFullScreen(true)}
              className="text-xs md:text-sm px-3 py-1 bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 rounded transition-colors"
              title="Full screen reader"
            >
              Full Screen
            </button>
          </div>
        </div>
        <div
          className={`${themeClasses[theme]} ${fontSizeClasses[fontSize]} ${fontFamilyClasses[fontFamily]} p-4 md:p-6 rounded-lg leading-relaxed whitespace-pre-wrap max-h-[60vh] overflow-y-auto custom-scrollbar`}
        >
          {chapter.content}
        </div>
      </div>

      {/* Full Screen Reader Modal */}
      {isFullScreen && (
        <div className="fixed inset-0 z-50 bg-gray-900 overflow-hidden flex flex-col">
          {/* Floating Settings Button */}
          <button
            onClick={() => setShowControls(!showControls)}
            className="fixed top-4 right-4 z-50 w-10 h-10 md:w-12 md:h-12 bg-gray-800/90 hover:bg-gray-700 text-amber-400 rounded-full shadow-lg flex items-center justify-center transition-all"
            aria-label="Settings"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* Close Button */}
          <button
            onClick={() => setIsFullScreen(false)}
            className="fixed top-4 left-4 z-50 w-10 h-10 md:w-12 md:h-12 bg-gray-800/90 hover:bg-red-600/90 text-gray-400 hover:text-white rounded-full shadow-lg flex items-center justify-center transition-all"
            aria-label="Close"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Settings Panel - Slides in from right */}
          {showControls && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-black/50 z-40"
                onClick={() => setShowControls(false)}
              />

              {/* Settings Panel */}
              <div className="fixed top-0 right-0 h-full w-72 md:w-80 bg-gray-800 shadow-2xl z-50 p-6 overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-amber-400">Reading Settings</h3>
                  <button
                    onClick={() => setShowControls(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Font Size */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">Font Size</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setFontSize('small')}
                        className={`flex-1 px-3 py-2 text-xs rounded ${fontSize === 'small' ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                      >
                        A
                      </button>
                      <button
                        onClick={() => setFontSize('medium')}
                        className={`flex-1 px-3 py-2 text-sm rounded ${fontSize === 'medium' ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                      >
                        A
                      </button>
                      <button
                        onClick={() => setFontSize('large')}
                        className={`flex-1 px-3 py-2 text-base rounded ${fontSize === 'large' ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                      >
                        A
                      </button>
                    </div>
                  </div>

                  {/* Theme */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">Theme</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setTheme('dark')}
                        className={`flex-1 px-4 py-2 text-sm rounded ${theme === 'dark' ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                      >
                        Night
                      </button>
                      <button
                        onClick={() => setTheme('light')}
                        className={`flex-1 px-4 py-2 text-sm rounded ${theme === 'light' ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                      >
                        Day
                      </button>
                    </div>
                  </div>

                  {/* Font Family */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">Font Family</label>
                    <div className="space-y-2">
                      <button
                        onClick={() => setFontFamily('serif')}
                        className={`w-full px-4 py-2 text-sm rounded font-serif text-left ${fontFamily === 'serif' ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                      >
                        Serif
                      </button>
                      <button
                        onClick={() => setFontFamily('sans')}
                        className={`w-full px-4 py-2 text-sm rounded font-sans text-left ${fontFamily === 'sans' ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                      >
                        Sans Serif
                      </button>
                      <button
                        onClick={() => setFontFamily('mono')}
                        className={`w-full px-4 py-2 text-sm rounded font-mono text-left ${fontFamily === 'mono' ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                      >
                        Monospace
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Reader Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className={`${themeClasses[theme]} min-h-full`}>
              <div className={`max-w-4xl mx-auto p-6 md:p-12 ${fontSizeClasses[fontSize]} ${fontFamilyClasses[fontFamily]} leading-relaxed whitespace-pre-wrap`}>
                {chapter.content}
              </div>
            </div>
          </div>
        </div>
      )}

       <style>{`
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in {
            animation: fade-in 0.5s ease-out forwards;
          }

          /* Custom Scrollbar Styles - Same as sidebar */
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
          }

          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(31, 41, 55, 0.5);
            border-radius: 4px;
          }

          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(217, 119, 6, 0.5);
            border-radius: 4px;
            transition: background 0.2s;
          }

          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(217, 119, 6, 0.7);
          }

          /* Firefox */
          .custom-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: rgba(217, 119, 6, 0.5) rgba(31, 41, 55, 0.5);
          }
        `}</style>
    </div>
  );
};

export default SummaryDisplay;