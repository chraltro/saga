/**
 * Authentication service for managing API keys
 */

export interface AuthCredentials {
  githubPAT: string;
  geminiApiKey: string;
}

const STORAGE_KEY = 'saga_auth_credentials';

/**
 * Save credentials to localStorage
 */
export function saveCredentials(credentials: AuthCredentials): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
}

/**
 * Load credentials from localStorage
 */
export function loadCredentials(): AuthCredentials | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as AuthCredentials;
  } catch {
    return null;
  }
}

/**
 * Clear credentials from localStorage
 */
export function clearCredentials(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  const credentials = loadCredentials();
  return !!(credentials?.githubPAT && credentials?.geminiApiKey);
}

/**
 * Validate GitHub PAT format
 */
export function validateGitHubPAT(pat: string): boolean {
  // GitHub PATs start with ghp_, github_pat_, or are classic tokens (40 chars)
  return /^(ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{82}|[a-f0-9]{40})$/.test(pat);
}

/**
 * Validate Gemini API key format
 */
export function validateGeminiApiKey(key: string): boolean {
  // Gemini API keys are typically 39 characters starting with "AI"
  return /^AI[a-zA-Z0-9_-]{37,}$/.test(key);
}
