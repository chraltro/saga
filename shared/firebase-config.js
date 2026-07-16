/**
 * Firebase Configuration
 *
 * These are the real values for this project's Firebase web app, not placeholders.
 * A Firebase web API key is a public project identifier, not a secret: it ships in
 * every client bundle by design and grants no access on its own. Access is controlled
 * by the Firestore security rules and the list of authorized domains in the Firebase
 * console, so those are what must stay correct.
 *
 * The Firestore rules this app expects:
 *    rules_version = '2';
 *    service cloud.firestore {
 *      match /databases/{database}/documents {
 *        match /users/{userId} {
 *          allow read, write: if request.auth != null && request.auth.uid == userId;
 *        }
 *      }
 *    }
 */

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyClwLix-PHVCV9soMjiOzvIhZTYyLrPqYU",
  authDomain: "norron-5cf3c.firebaseapp.com",
  projectId: "norron-5cf3c",
  storageBucket: "norron-5cf3c.firebasestorage.app",
  messagingSenderId: "553127903115",
  appId: "1:553127903115:web:c9f895fec921ed2594f98e"
};

// Encryption key for additional security layer
export const ENCRYPTION_ENABLED = true;
