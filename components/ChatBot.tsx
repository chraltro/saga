import React, { useState, useRef, useEffect } from 'react';
import { marked } from 'marked';
import { Chapter, Summary, BookRecord } from '../types';
import { chatWithGeminiStream, ChatMessage } from '../services/gemini';
import { SendIcon, SpinnerIcon, SettingsIcon, XIcon } from './Icons';

// Configure marked for inline rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});

export type ContextType = 'current-chapter' | 'up-to-current' | 'all-chapters' | 'all-summaries' | 'summaries-up-to-current';

interface ChatBotProps {
  currentBook: BookRecord;
  selectedChapterIndex: number;
  onClose: () => void;
}

const ChatBot: React.FC<ChatBotProps> = ({ currentBook, selectedChapterIndex, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [contextType, setContextType] = useState<ContextType>('current-chapter');
  const [allowSpoilers, setAllowSpoilers] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages or streaming text changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  // Focus input after AI finishes responding
  useEffect(() => {
    if (!isProcessing && messages.length > 0) {
      textareaRef.current?.focus();
    }
  }, [isProcessing, messages.length]);

  // Build context based on selected type
  const buildContext = (): string => {
    const { chapters, summaries } = currentBook;

    switch (contextType) {
      case 'current-chapter':
        return `Chapter ${selectedChapterIndex + 1}: ${chapters[selectedChapterIndex].title}\n\n${chapters[selectedChapterIndex].content}`;

      case 'up-to-current': {
        let context = '';
        for (let i = 0; i <= selectedChapterIndex; i++) {
          context += `\n\n=== Chapter ${i + 1}: ${chapters[i].title} ===\n\n${chapters[i].content}`;
        }
        return context;
      }

      case 'all-chapters': {
        let context = '';
        chapters.forEach((ch, idx) => {
          context += `\n\n=== Chapter ${idx + 1}: ${ch.title} ===\n\n${ch.content}`;
        });
        return context;
      }

      case 'all-summaries': {
        let context = '';
        chapters.forEach((ch, idx) => {
          const summary = summaries[idx];
          if (summary) {
            context += `\n\n=== Chapter ${idx + 1}: ${ch.title} ===\nSummary:\n`;
            summary.bullets.forEach(bullet => {
              context += `- ${bullet}\n`;
            });
            if (summary.quote) {
              context += `Quote: "${summary.quote}"\n`;
            }
          } else {
            context += `\n\n=== Chapter ${idx + 1}: ${ch.title} ===\n(Not yet summarized)\n`;
          }
        });
        return context;
      }

      case 'summaries-up-to-current': {
        let context = '';
        for (let i = 0; i <= selectedChapterIndex; i++) {
          const summary = summaries[i];
          if (summary) {
            context += `\n\n=== Chapter ${i + 1}: ${chapters[i].title} ===\nSummary:\n`;
            summary.bullets.forEach(bullet => {
              context += `- ${bullet}\n`;
            });
            if (summary.quote) {
              context += `Quote: "${summary.quote}"\n`;
            }
          } else {
            context += `\n\n=== Chapter ${i + 1}: ${chapters[i].title} ===\n(Not yet summarized)\n`;
          }
        }
        // Add full text of current chapter
        context += `\n\n=== Current Chapter (Full Text) ===\nChapter ${selectedChapterIndex + 1}: ${chapters[selectedChapterIndex].title}\n\n${chapters[selectedChapterIndex].content}`;
        return context;
      }

      default:
        return '';
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;

    const userMessage: ChatMessage = { role: 'user', content: inputValue.trim() };
    const isFirstMessage = messages.length === 0;

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);
    setError(null);
    setStreamingText('');

    try {
      const context = buildContext();
      const stream = await chatWithGeminiStream([...messages, userMessage], context, isFirstMessage, allowSpoilers, selectedChapterIndex + 1);

      let fullResponse = '';
      for await (const chunk of stream) {
        fullResponse += chunk.text;
        setStreamingText(fullResponse);
      }

      // Once streaming is complete, add the full message
      setMessages(prev => [...prev, { role: 'assistant', content: fullResponse }]);
      setStreamingText('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(message);
      setStreamingText('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getContextLabel = (type: ContextType): string => {
    switch (type) {
      case 'current-chapter':
        return 'Current Chapter (Full Text)';
      case 'up-to-current':
        return 'All Chapters Up to Current (Full Text)';
      case 'all-chapters':
        return 'All Chapters (Full Text)';
      case 'all-summaries':
        return 'All Chapter Summaries';
      case 'summaries-up-to-current':
        return 'Summaries + Current Chapter (Full Text)';
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 md:inset-auto md:bottom-4 md:right-4 md:w-[450px] md:h-[600px] z-50 flex flex-col bg-gray-800 rounded-none md:rounded-lg shadow-2xl border border-amber-900/30">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-amber-900/20 bg-gray-900/50">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-amber-400">Chat with Gemini</h3>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1 text-gray-400 hover:text-amber-400 transition-colors"
            aria-label="Settings"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-amber-400 transition-colors"
          aria-label="Close chat"
        >
          <XIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 border-b border-amber-900/20 bg-gray-900/30 space-y-3">
          <div>
            <label className="block text-sm font-semibold text-amber-400/90 mb-2">Context:</label>
            <select
              value={contextType}
              onChange={(e) => setContextType(e.target.value as ContextType)}
              className="w-full bg-gray-700 text-gray-100 border border-amber-900/30 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="current-chapter">Current Chapter (Full Text)</option>
              <option value="summaries-up-to-current">Summaries + Current Chapter</option>
              <option value="up-to-current">All Chapters Up to Current</option>
              <option value="all-summaries">All Chapter Summaries</option>
              <option value="all-chapters">All Chapters (Full Text)</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Current: {getContextLabel(contextType)}
            </p>
          </div>

          <div className="pt-2 border-t border-amber-900/20">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowSpoilers}
                onChange={(e) => setAllowSpoilers(e.target.checked)}
                className="w-4 h-4 rounded border-amber-900/30 bg-gray-700 text-amber-600 focus:ring-2 focus:ring-amber-500"
              />
              <span className="text-sm font-semibold text-amber-400/90">Allow Spoilers</span>
            </label>
            <p className="text-xs text-gray-400 mt-1 ml-6">
              {allowSpoilers
                ? '⚠️ AI can reveal future events'
                : '✓ AI will only discuss up to chapter ' + (selectedChapterIndex + 1)
              }
            </p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 chatbot-messages">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            <p className="text-lg font-semibold text-amber-400/80 mb-2">Start a conversation</p>
            <p className="text-sm">Ask questions about the book, characters, themes, or events.</p>
            <p className="text-xs mt-4">Using context: {getContextLabel(contextType)}</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] px-4 py-2 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-700 text-gray-100'
              }`}
            >
              {msg.role === 'user' ? (
                <p className="whitespace-pre-wrap break-words text-sm">{msg.content}</p>
              ) : (
                <div
                  className="prose prose-sm prose-invert max-w-none break-words"
                  dangerouslySetInnerHTML={{ __html: marked(msg.content) }}
                />
              )}
            </div>
          </div>
        ))}
        {streamingText && (
          <div className="flex justify-start">
            <div className="bg-gray-700 text-gray-100 px-4 py-2 rounded-lg max-w-[85%]">
              <div
                className="prose prose-sm prose-invert max-w-none break-words"
                dangerouslySetInnerHTML={{ __html: marked(streamingText) }}
              />
            </div>
          </div>
        )}
        {isProcessing && !streamingText && (
          <div className="flex justify-start">
            <div className="bg-gray-700 text-gray-100 px-4 py-2 rounded-lg">
              <SpinnerIcon className="w-5 h-5 text-amber-400 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error message */}
      {error && (
        <div className="px-4 py-2 bg-red-900/30 border-t border-red-900/50">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-amber-900/20 bg-gray-900/30">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about the book..."
            disabled={isProcessing}
            className="flex-1 bg-gray-700 text-gray-100 border border-amber-900/30 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            rows={2}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isProcessing}
            className="self-end p-2 bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Send message"
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">Press Enter to send, Shift+Enter for new line</p>
      </div>
    </div>
  );
};

export default ChatBot;
