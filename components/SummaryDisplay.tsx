import React from 'react';
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
  if (!chapter) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400">Select a chapter to view its summary.</p>
      </div>
    );
  }
  
  const hasContent = summary && (summary.bullets.length > 0 || summary.quote);

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
        <div className="flex items-center gap-3 mb-4">
          <FileTextIcon className="w-6 h-6 md:w-7 md:h-7 text-amber-400" />
          <h3 className="text-xl md:text-2xl font-bold text-amber-100">Full Chapter Text</h3>
        </div>
        <div
          className="bg-gray-800/50 p-4 md:p-6 rounded-lg text-gray-300 text-sm md:text-base leading-relaxed whitespace-pre-wrap max-h-[60vh] overflow-y-auto"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          {chapter.content}
        </div>
      </div>

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