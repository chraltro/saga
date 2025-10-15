import React, { useState, useCallback, useMemo, useEffect, lazy, Suspense } from 'react';
import { Chapter, Summary, BookRecord } from './types';
import { parseChapters, extractBookTitle } from './services/parser';
import { parseEpub } from './services/epubParser';
import { summarizeChapterStream } from './services/gemini';
import * as storage from './services/storage';
import * as auth from './services/auth';
import LoginScreen from './components/LoginScreen';
import ChapterMenu from './components/ChapterMenu';
import { BookOpenIcon, ArrowLeftIcon, SagaLogo, SpinnerIcon, MenuIcon, XIcon, MessageCircleIcon } from './components/Icons';
import logoImg from '/logo.png';

// Lazy load heavy components with large dependencies
const FileUploadScreen = lazy(() => import('./components/FileUploadScreen'));
const SummaryDisplay = lazy(() => import('./components/SummaryDisplay'));
const ChatBot = lazy(() => import('./components/ChatBot'));

function App(): React.ReactElement {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentBook, setCurrentBook] = useState<BookRecord | null>(null);
  const [history, setHistory] = useState<BookRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [streamingSummaries, setStreamingSummaries] = useState<Record<number, Summary>>({});
  const [processingChapterIndex, setProcessingChapterIndex] = useState<number | null>(null);
  const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false);

  const [selectedChapterIndex, setSelectedChapterIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isChatBotOpen, setIsChatBotOpen] = useState<boolean>(false);

  // Debounce timer for saving to gist
  const saveTimerRef = React.useRef<number | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = auth.isAuthenticated();
      setIsAuthenticated(authenticated);

      if (authenticated) {
        try {
          await storage.initStorage();
          // Load only metadata for fast initial load
          const books = await storage.getAllBooksMetadata();
          setHistory(books);
        } catch (err) {
          setError("Could not load library from GitHub Gist.");
        }
      }

      setIsLoading(false);
    };
    checkAuth();

    // Cleanup: flush any pending saves on unmount
    return () => {
      if (saveTimerRef.current !== null) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const handleLogin = useCallback(async (githubPAT: string, geminiApiKey: string) => {
    setLoginError(null);
    setIsLoading(true);

    try {
      // Save credentials
      auth.saveCredentials({ githubPAT, geminiApiKey });

      // Load books metadata from gist (fast)
      await storage.initStorage();
      const books = await storage.getAllBooksMetadata();
      setHistory(books);

      setIsAuthenticated(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load library";
      setLoginError(message);
      auth.clearCredentials();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLogout = useCallback(() => {
    auth.clearCredentials();
    setIsAuthenticated(false);
    setCurrentBook(null);
    setHistory([]);
    setError(null);
    setLoginError(null);
  }, []);

  const updateCurrentBook = useCallback((updatedBookData: Partial<BookRecord>) => {
    setCurrentBook(prevBook => {
      if (!prevBook) return null;
      const newBook = { ...prevBook, ...updatedBookData };

      // Debounce saves to prevent race conditions
      if (saveTimerRef.current !== null) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = window.setTimeout(() => {
        storage.updateBook(newBook).catch(err => {
          console.error("Failed to update book in storage:", err);
          setError("Could not save progress to GitHub Gist. Changes may be lost.");
        });
      }, 2000); // Wait 2 seconds after last update before saving

      return newBook;
    });
  }, []);


  const handleFileUpload = useCallback(async (file: File) => {
    setError(null);
    setIsLoading(true);
    try {
      let chapters: Chapter[];
      let bookTitle = file.name;

      if (file.type === 'text/plain') {
        const text = await file.text();
        chapters = parseChapters(text);
        bookTitle = extractBookTitle(text);
      } else if (file.name.endsWith('.epub')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await parseEpub(arrayBuffer);
        chapters = result.chapters;
        bookTitle = result.title;
      } else {
        throw new Error("Unsupported file type. Please use .txt or .epub.");
      }

      if (chapters.length === 0) {
        throw new Error("Could not find any chapters in the uploaded file.");
      }

      const newBook: Omit<BookRecord, 'id'> = {
        title: bookTitle,
        chapters,
        summaries: {},
        images: {},
        lastAccessed: Date.now(),
      };

      const newId = await storage.addBook(newBook);
      const fullBookRecord = { ...newBook, id: newId };

      setCurrentBook(fullBookRecord);
      setHistory(prev => [fullBookRecord, ...prev.filter(b => b.id !== newId)]);
      setSelectedChapterIndex(0);
      setStreamingSummaries({});

    } catch (err) {
      const message = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLoadFromHistory = useCallback(async (id: number) => {
    setError(null);
    setIsLoading(true);
    try {
      const book = await storage.getBook(id);
      if (book) {
        book.lastAccessed = Date.now();
        await storage.updateBook(book);
        setCurrentBook(book);
        setSelectedChapterIndex(0);
        setStreamingSummaries({});
        setHistory(prev => {
          const otherBooks = prev.filter(b => b.id !== id);
          return [book, ...otherBooks];
        });
      } else {
        setError("Could not load the selected book from history.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleClearHistory = useCallback(async () => {
    if (window.confirm("Are you sure you want to delete all your books from GitHub Gist? This action cannot be undone.")) {
      await storage.clearHistory();
      setHistory([]);
    }
  }, []);

  const handleBackToLibrary = useCallback(() => {
    setCurrentBook(null);
    setError(null);
  }, []);
  
  const summarizeChapterByIndex = useCallback(async (index: number) => {
    if (!currentBook || currentBook.summaries[index] || processingChapterIndex === index) {
      return;
    }
    const chapter = currentBook.chapters[index];
    if (!chapter) return;

    setProcessingChapterIndex(index);
    setError(null);
    setStreamingSummaries(prev => ({
      ...prev,
      [index]: { bullets: [], quote: '' }
    }));

    try {
      const stream = await summarizeChapterStream(chapter.content);
      let fullResponseText = '';
      let finalSummary: Summary | null = null;
      
      for await (const chunk of stream) {
        fullResponseText += chunk.text;

        const currentSummary: Summary = { bullets: [], quote: '' };
        const lines = fullResponseText.split('\n');
        lines.forEach(line => {
          if (line.startsWith('BULLET: ')) currentSummary.bullets.push(line.substring(8).trim());
          else if (line.startsWith('QUOTE: ')) {
            currentSummary.quote = line.substring(7).trim();
          }
        });
        
        finalSummary = currentSummary;
        setStreamingSummaries(prev => ({ ...prev, [index]: finalSummary! }));
      }

      if (finalSummary) {
        // Use functional update to avoid stale closure
        setCurrentBook(prevBook => {
          if (!prevBook) return null;
          const updatedBook = {
            ...prevBook,
            summaries: { ...prevBook.summaries, [index]: finalSummary }
          };

          // Debounce the save
          if (saveTimerRef.current !== null) {
            clearTimeout(saveTimerRef.current);
          }
          saveTimerRef.current = window.setTimeout(() => {
            storage.updateBook(updatedBook).catch(err => {
              console.error("Failed to update book in storage:", err);
              setError("Could not save progress to GitHub Gist. Changes may be lost.");
            });
          }, 2000);

          return updatedBook;
        });
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed to summarize chapter: ${chapter.title}. ${message}`);
    } finally {
        // Always clear processing state for this chapter
        setProcessingChapterIndex(prev => prev === index ? null : prev);
    }
  }, [currentBook, processingChapterIndex]);


  const handleSelectAndSummarizeChapter = useCallback(async (index: number) => {
    setSelectedChapterIndex(index);
    setIsMobileMenuOpen(false); // Close mobile menu when selecting chapter
    await summarizeChapterByIndex(index);
  }, [summarizeChapterByIndex]);

  const handleSummarizeNextFive = useCallback(async () => {
    if (!currentBook) return;
    setIsBatchProcessing(true);

    // Find all unsummarized chapter indices
    const unsummarizedIndices: number[] = [];
    for (let i = 0; i < currentBook.chapters.length; i++) {
      if (!currentBook.summaries[i]) {
        unsummarizedIndices.push(i);
      }
    }

    if (unsummarizedIndices.length === 0) {
        setIsBatchProcessing(false);
        return;
    }

    // Take the first 5 unsummarized chapters
    const indicesToProcess = unsummarizedIndices.slice(0, 5);

    for (const index of indicesToProcess) {
        await summarizeChapterByIndex(index);
    }

    setIsBatchProcessing(false);
  }, [currentBook, summarizeChapterByIndex]);

  const selectedChapter = useMemo(() => {
    return currentBook?.chapters[selectedChapterIndex];
  }, [currentBook, selectedChapterIndex]);

  const summaryToDisplay = useMemo(() => {
    return currentBook?.summaries[selectedChapterIndex] || streamingSummaries[selectedChapterIndex];
  }, [currentBook, streamingSummaries, selectedChapterIndex]);

  const isChapterProcessing = useMemo(() => {
      return processingChapterIndex === selectedChapterIndex;
  }, [processingChapterIndex, selectedChapterIndex]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white gap-4">
        <SpinnerIcon className="w-12 h-12 text-amber-400 animate-spin" />
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} error={loginError} />;
  }

  if (!currentBook) {
    return (
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white gap-4">
          <SpinnerIcon className="w-12 h-12 text-amber-400 animate-spin" />
          <p className="text-gray-400">Loading library...</p>
        </div>
      }>
        <FileUploadScreen
          onFileUpload={handleFileUpload}
          error={error}
          history={history}
          onLoadFromHistory={handleLoadFromHistory}
          onClearHistory={handleClearHistory}
          onLogout={handleLogout}
        />
      </Suspense>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen font-sans bg-gray-900 text-gray-100">
      {/* Mobile header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-gray-800/50 border-b border-amber-900/20">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 text-amber-400 hover:text-amber-300"
          aria-label="Open menu"
        >
          <MenuIcon className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold text-amber-400/90 truncate flex-1 mx-4" title={currentBook.title}>
          {currentBook.title}
        </h1>
        <button
          onClick={handleBackToLibrary}
          className="p-2 text-gray-400 hover:text-amber-400"
          aria-label="Back to library"
        >
          <ArrowLeftIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Sidebar - desktop always visible, mobile as overlay */}
      <aside className={`
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
        fixed md:relative
        inset-y-0 left-0
        z-50
        w-80 md:w-1/4 md:min-w-[300px] md:max-w-[400px]
        bg-gray-800/95 md:bg-gray-800/50
        border-r border-amber-900/20
        flex flex-col p-4
        transition-transform duration-300 ease-in-out
      `}>
        {/* Desktop header */}
        <div className="hidden md:flex items-start justify-between gap-3 mb-4 p-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <img src={logoImg} alt="SAGA Logo" className="w-10 h-10 flex-shrink-0" />
              <h1 className="text-xl font-bold tracking-tight text-amber-400/90 break-words" title={currentBook.title}>{currentBook.title}</h1>
            </div>
            <button onClick={handleBackToLibrary} className="p-1 flex-shrink-0 text-gray-400 hover:text-amber-400 transition-colors" aria-label="Back to library">
              <ArrowLeftIcon className="w-6 h-6"/>
            </button>
        </div>

        {/* Mobile header inside sidebar */}
        <div className="md:hidden flex items-center justify-between mb-4 p-2">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="SAGA Logo" className="w-10 h-10" />
            <h2 className="text-lg font-bold text-amber-400/90">Chapters</h2>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 text-gray-400 hover:text-amber-400"
            aria-label="Close menu"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        <ChapterMenu
          chapters={currentBook.chapters}
          summarizedChapters={currentBook.summaries}
          selectedIndex={selectedChapterIndex}
          onSelectChapter={handleSelectAndSummarizeChapter}
          processingChapterIndex={processingChapterIndex}
        />
        <div className="mt-auto pt-4 border-t border-amber-900/20 space-y-2">
           <button
            onClick={handleSummarizeNextFive}
            disabled={isBatchProcessing || Object.keys(currentBook.summaries).length === currentBook.chapters.length}
            className="w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold py-2 px-4 rounded-md hover:from-amber-700 hover:to-orange-700 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50 shadow-lg"
           >
            {isBatchProcessing ? 'Processing...' : 'Summarize Next 5'}
           </button>
           <p className="text-sm text-center text-gray-400">
            {Object.keys(currentBook.summaries).length} / {currentBook.chapters.length} chapters summarized
          </p>
           {error && <p className="text-red-400 text-sm mt-2 text-center px-2">{error}</p>}
           <button
            onClick={handleLogout}
            className="w-full text-sm text-gray-400 hover:text-amber-400 transition-colors py-2"
           >
            Logout
           </button>
        </div>
      </aside>

      {/* Mobile menu backdrop */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
            <SpinnerIcon className="w-12 h-12 text-amber-400 animate-spin" />
            <p>Loading chapter...</p>
          </div>
        }>
          <SummaryDisplay
              chapter={selectedChapter}
              summary={summaryToDisplay}
              isProcessing={isChapterProcessing}
              onPreviousChapter={() => {
                if (selectedChapterIndex > 0) {
                  handleSelectAndSummarizeChapter(selectedChapterIndex - 1);
                }
              }}
              onNextChapter={() => {
                if (currentBook && selectedChapterIndex < currentBook.chapters.length - 1) {
                  handleSelectAndSummarizeChapter(selectedChapterIndex + 1);
                }
              }}
              hasPrevious={selectedChapterIndex > 0}
              hasNext={currentBook ? selectedChapterIndex < currentBook.chapters.length - 1 : false}
          />
        </Suspense>
      </main>

      {/* Floating Chat Button */}
      {!isChatBotOpen && (
        <button
          onClick={() => setIsChatBotOpen(true)}
          className="fixed bottom-6 right-6 p-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-full shadow-2xl hover:from-amber-700 hover:to-orange-700 transition-all transform hover:scale-110 z-40"
          aria-label="Open chat"
        >
          <MessageCircleIcon className="w-6 h-6" />
        </button>
      )}

      {/* ChatBot */}
      {isChatBotOpen && (
        <Suspense fallback={
          <div className="fixed bottom-0 right-0 w-full md:w-96 h-[500px] bg-gray-800 border-l border-t border-amber-900/20 shadow-2xl rounded-t-xl flex items-center justify-center z-50">
            <div className="flex flex-col items-center gap-4">
              <SpinnerIcon className="w-10 h-10 text-amber-400 animate-spin" />
              <p className="text-gray-400">Loading chat...</p>
            </div>
          </div>
        }>
          <ChatBot
            currentBook={currentBook}
            selectedChapterIndex={selectedChapterIndex}
            onClose={() => setIsChatBotOpen(false)}
          />
        </Suspense>
      )}
    </div>
  );
}

export default App;