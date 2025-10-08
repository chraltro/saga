import React, { useState } from 'react';
import { SagaLogo } from './Icons';
import { validateGitHubPAT, validateGeminiApiKey } from '../services/auth';
import { testGitHubPAT } from '../services/gist';
import logoImg from '../public/logo.png';

interface LoginScreenProps {
  onLogin: (githubPAT: string, geminiApiKey: string) => void;
  error: string | null;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, error }) => {
  const [githubPAT, setGithubPAT] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [showGithubPAT, setShowGithubPAT] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [useQuickLogin, setUseQuickLogin] = useState(false);
  const [quickLoginCode, setQuickLoginCode] = useState('');

  const handleQuickLoginPaste = (code: string) => {
    try {
      const decoded = atob(code);
      const [pat, key] = decoded.split(':::');
      if (pat && key) {
        setGithubPAT(pat);
        setGeminiApiKey(key);
        setUseQuickLogin(false);
      } else {
        setValidationError('Invalid quick login code');
      }
    } catch {
      setValidationError('Invalid quick login code');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    let finalGithubPAT = githubPAT;
    let finalGeminiKey = geminiApiKey;

    // Handle quick login
    if (useQuickLogin && quickLoginCode) {
      try {
        const decoded = atob(quickLoginCode);
        const [pat, key] = decoded.split(':::');
        if (!pat || !key) {
          setValidationError('Invalid quick login code');
          return;
        }
        finalGithubPAT = pat;
        finalGeminiKey = key;
      } catch {
        setValidationError('Invalid quick login code');
        return;
      }
    }

    // Validate formats
    if (!validateGitHubPAT(finalGithubPAT)) {
      setValidationError('Invalid GitHub Personal Access Token format');
      return;
    }

    if (!validateGeminiApiKey(finalGeminiKey)) {
      setValidationError('Invalid Gemini API key format');
      return;
    }

    setIsLoading(true);

    try {
      // Test GitHub PAT
      const isValidPAT = await testGitHubPAT(finalGithubPAT);
      if (!isValidPAT) {
        setValidationError('GitHub PAT is invalid or expired. Please check your token.');
        setIsLoading(false);
        return;
      }

      // If validation passes, proceed with login
      onLogin(finalGithubPAT, finalGeminiKey);
    } catch (err) {
      setValidationError('Failed to validate credentials. Please check your internet connection.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="max-w-md w-full p-8 space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <img src={logoImg} alt="SAGA Logo" className="w-24 h-24" />
          </div>
          <h1 className="text-5xl font-extrabold mb-3 tracking-wide">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500">SAGA</span>
          </h1>
          <p className="text-xl text-amber-400/80 mb-2 font-semibold tracking-wider">Your Story Companion</p>
          <p className="text-sm text-gray-400 mb-8">
            Enter your credentials to access your library across all devices
          </p>
        </div>

        <div className="flex justify-center mb-6">
          <button
            type="button"
            onClick={() => setUseQuickLogin(!useQuickLogin)}
            className="text-sm text-amber-400 hover:text-amber-300 underline"
          >
            {useQuickLogin ? 'Use individual keys' : 'Have a quick login code?'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {useQuickLogin ? (
            <div>
              <label htmlFor="quick-login" className="block text-sm font-medium text-gray-300 mb-2">
                Quick Login Code
              </label>
              <input
                id="quick-login"
                type="text"
                value={quickLoginCode}
                onChange={(e) => setQuickLoginCode(e.target.value)}
                placeholder="Paste your login code here"
                required
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <p className="mt-2 text-xs text-gray-500">
                Enter the code you copied from another device
              </p>
            </div>
          ) : (
            <>
          <div>
            <label htmlFor="github-pat" className="block text-sm font-medium text-gray-300 mb-2">
              GitHub Personal Access Token
            </label>
            <div className="relative">
              <input
                id="github-pat"
                type={showGithubPAT ? 'text' : 'password'}
                value={githubPAT}
                onChange={(e) => setGithubPAT(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxx"
                required
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowGithubPAT(!showGithubPAT)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-amber-400 text-sm"
              >
                {showGithubPAT ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Need a token? <a href="https://github.com/settings/tokens/new?scopes=gist" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 underline">Create one here</a> with 'gist' scope
            </p>
          </div>

          <div>
            <label htmlFor="gemini-key" className="block text-sm font-medium text-gray-300 mb-2">
              Gemini API Key
            </label>
            <div className="relative">
              <input
                id="gemini-key"
                type={showGeminiKey ? 'text' : 'password'}
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="AIzaSyxxxxxxxxxx"
                required
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowGeminiKey(!showGeminiKey)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-amber-400 text-sm"
              >
                {showGeminiKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Need a key? <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 underline">Get one here</a>
            </p>
          </div>
            </>
          )}

          {(validationError || error) && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg">
              <span className="block text-sm">{validationError || error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold py-3 px-4 rounded-lg hover:from-amber-700 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {isLoading ? 'Validating...' : 'Enter SAGA'}
          </button>
        </form>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Your credentials are stored locally and never sent to our servers
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
