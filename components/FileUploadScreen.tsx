
import React, { useCallback, useState } from 'react';
import { UploadCloudIcon, LibraryIcon, TrashIcon, SagaLogo } from './Icons';
import { BookRecord } from '../types';
import { loadCredentials } from '../services/auth';
import logoImg from '../public/logo.png';

interface FileUploadScreenProps {
  onFileUpload: (file: File) => void;
  error: string | null;
  history: BookRecord[];
  onLoadFromHistory: (id: number) => void;
  onClearHistory: () => void;
  onLogout?: () => void;
}

const FileUploadScreen: React.FC<FileUploadScreenProps> = ({
  onFileUpload,
  error,
  history,
  onLoadFromHistory,
  onClearHistory,
  onLogout,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showQuickLogin, setShowQuickLogin] = useState(false);

  const getQuickLoginCode = () => {
    const creds = loadCredentials();
    if (creds) {
      return btoa(`${creds.githubPAT}:::${creds.geminiApiKey}`);
    }
    return '';
  };

  const copyQuickLoginCode = () => {
    const code = getQuickLoginCode();
    navigator.clipboard.writeText(code);
    alert('Quick login code copied! You can now paste this on another device to log in quickly.');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files[0]);
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileUpload(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  }, [onFileUpload]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
      {onLogout && (
        <div className="hidden md:flex absolute top-4 right-4 gap-2">
          <button
            onClick={copyQuickLoginCode}
            className="text-xs px-3 py-1 bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 rounded transition-colors"
            title="Copy quick login code"
          >
            Copy Login Code
          </button>
          <button
            onClick={onLogout}
            className="text-sm text-gray-400 hover:text-amber-400 transition-colors"
          >
            Logout
          </button>
        </div>
      )}
      <div className="max-w-4xl w-full p-8 space-y-12 flex-1 flex flex-col justify-center">
        <div className="text-center">
            <div className="flex justify-center mb-6">
                <img src={logoImg} alt="SAGA Logo" className="w-24 h-24" />
            </div>
            <h1 className="text-5xl font-extrabold text-white sm:text-6xl md:text-7xl mb-3 tracking-wide">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500">SAGA</span>
            </h1>
            <p className="text-xl text-amber-400/80 mb-2 font-semibold tracking-wider">Your Story Companion</p>
            <p className="text-base text-gray-400 mb-8 max-w-lg mx-auto">
            Upload a book as <code className="bg-gray-800/50 text-amber-400/90 rounded px-2 py-0.5 text-sm">.txt</code> or <code className="bg-gray-800/50 text-amber-400/90 rounded px-2 py-0.5 text-sm">.epub</code> to generate chapter summaries
            </p>

            <label
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`relative block w-full rounded-lg border-2 border-dashed p-12 text-center hover:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-gray-900 cursor-pointer transition-colors ${
                isDragging ? 'border-amber-500 bg-gray-800/50' : 'border-gray-600'
            }`}
            >
            <UploadCloudIcon className="mx-auto h-12 w-12 text-gray-500" />
            <span className="mt-2 block text-sm font-medium text-gray-300">
                {isDragging ? 'Drop the file here' : 'Drag & Drop a file or click to upload'}
            </span>
            <input
                id="file-upload"
                name="file-upload"
                type="file"
                accept=".txt,.epub"
                className="sr-only"
                onChange={handleFileChange}
            />
            </label>
            
            {error && (
                <div className="mt-6 bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg relative" role="alert">
                    <strong className="font-bold">Oh no! </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
            )}
        </div>

        {history.length > 0 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <LibraryIcon className="w-8 h-8 text-amber-400"/>
                    <h2 className="text-3xl font-bold text-white">My Library</h2>
                </div>
                <button
                    onClick={onClearHistory}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-400 transition-colors"
                >
                    <TrashIcon className="w-4 h-4"/>
                    Clear History
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {history.map(book => (
                <button 
                  key={book.id}
                  onClick={() => onLoadFromHistory(book.id!)}
                  className="bg-gray-800/50 p-4 rounded-lg text-left hover:bg-gray-700/50 transform hover:-translate-y-1 transition-all shadow-lg"
                >
                  <h3 className="font-bold text-lg text-gray-100 truncate">{book.title}</h3>
                  <p className="text-sm text-gray-400">{book.chapters.length} chapters</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile buttons at bottom */}
      {onLogout && (
        <div className="md:hidden w-full p-4 border-t border-gray-800 flex justify-center gap-4">
          <button
            onClick={copyQuickLoginCode}
            className="text-xs px-3 py-2 bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 rounded transition-colors"
            title="Copy quick login code"
          >
            Copy Login Code
          </button>
          <button
            onClick={onLogout}
            className="text-sm px-3 py-2 text-gray-400 hover:text-amber-400 transition-colors"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUploadScreen;
