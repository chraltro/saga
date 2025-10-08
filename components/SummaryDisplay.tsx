import React, { useState } from 'react';
import { Chapter, Summary } from '../types';
import { QuoteIcon, ListIcon, ImageIcon, FileTextIcon } from './Icons';
import Loader from './Loader';

interface SummaryDisplayProps {
  chapter: Chapter | undefined;
  summary: Summary | undefined;
  isProcessing: boolean;
}

const SummaryDisplay: React.FC<SummaryDisplayProps> = ({
  chapter,
  summary,
  isProcessing
}) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans' | 'mono'>('serif');

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
    <div className="max-w-4xl mx-auto">
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
                  "{summary.quote}"
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
          className={`${themeClasses[theme]} ${fontSizeClasses[fontSize]} ${fontFamilyClasses[fontFamily]} p-4 md:p-6 rounded-lg leading-relaxed whitespace-pre-wrap max-h-[60vh] overflow-y-auto`}
        >
          {chapter.content}
        </div>
      </div>

      {/* Full Screen Reader Modal */}
      {isFullScreen && (
        <div className="fixed inset-0 z-50 bg-gray-900 overflow-hidden flex flex-col">
          {/* Controls Bar */}
          <div className="bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between flex-wrap gap-4">
            <h3 className="text-lg font-bold text-amber-400 flex-1">{chapter.title}</h3>

            <div className="flex items-center gap-4 flex-wrap">
              {/* Font Size */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Size:</span>
                <button
                  onClick={() => setFontSize('small')}
                  className={`px-2 py-1 text-xs rounded ${fontSize === 'small' ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                >
                  A
                </button>
                <button
                  onClick={() => setFontSize('medium')}
                  className={`px-2 py-1 text-sm rounded ${fontSize === 'medium' ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                >
                  A
                </button>
                <button
                  onClick={() => setFontSize('large')}
                  className={`px-2 py-1 text-base rounded ${fontSize === 'large' ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                >
                  A
                </button>
              </div>

              {/* Theme */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Theme:</span>
                <button
                  onClick={() => setTheme('dark')}
                  className={`px-3 py-1 text-xs rounded ${theme === 'dark' ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                >
                  Night
                </button>
                <button
                  onClick={() => setTheme('light')}
                  className={`px-3 py-1 text-xs rounded ${theme === 'light' ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                >
                  Day
                </button>
              </div>

              {/* Font Family */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Font:</span>
                <button
                  onClick={() => setFontFamily('serif')}
                  className={`px-3 py-1 text-xs rounded font-serif ${fontFamily === 'serif' ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                >
                  Serif
                </button>
                <button
                  onClick={() => setFontFamily('sans')}
                  className={`px-3 py-1 text-xs rounded font-sans ${fontFamily === 'sans' ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                >
                  Sans
                </button>
                <button
                  onClick={() => setFontFamily('mono')}
                  className={`px-3 py-1 text-xs rounded font-mono ${fontFamily === 'mono' ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                >
                  Mono
                </button>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setIsFullScreen(false)}
                className="px-4 py-1 text-sm bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded transition-colors"
              >
                Close
              </button>
            </div>
          </div>

          {/* Reader Content */}
          <div className="flex-1 overflow-y-auto">
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
        `}</style>
    </div>
  );
};

export default SummaryDisplay;