export interface StoredKeys {
  geminiKey: string | null;
  githubToken: string | null;
}

export interface CurrentUser {
  userId: string;
  email: string;
  name: string;
}

export function initFirebase(): Promise<void>;
export function signInWithGoogle(): Promise<CurrentUser>;
export function getCurrentUser(): CurrentUser | null;
export function saveKeys(keys: { geminiKey: string; githubToken: string | null }): Promise<void>;
export function retrieveKeys(): Promise<StoredKeys | null>;
export function deleteKeys(): Promise<void>;
export function signOut(): Promise<void>;
