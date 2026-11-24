/**
 * Central Firebase Client SDK Export Module
 * Provides unified, singleton access to Firebase App, Auth, Firestore, and Storage.
 */

export {
  REQUIRED_FIREBASE_ENV_VARS,
  getMissingFirebaseEnvVars,
  isFirebaseConfigured,
  getFirebaseConfig,
} from './config.ts';

export {
  getFirebaseApp,
  tryGetFirebaseApp,
} from './app.ts';

export {
  getFirebaseAuth,
  tryGetFirebaseAuth,
  createGoogleAuthProvider,
} from './auth.ts';

export {
  getFirebaseFirestore,
  tryGetFirebaseFirestore,
} from './firestore.ts';

export {
  getFirebaseStorage,
  tryGetFirebaseStorage,
} from './storage.ts';
