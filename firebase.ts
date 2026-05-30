import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  serverTimestamp,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Configure Firestore settings with local offline cache persistence 
// This is critical for users behind VPNs/unstable connections to prevent crashes and keep user data cached.
const firestoreSettings = {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
};

const dbId = (firebaseConfig as any).firestoreDatabaseId;

// Initialize Firestore (CRITICAL: passing the custom firestoreDatabaseId handles isolated databases, otherwise defaults to standard)
export const db = dbId 
  ? initializeFirestore(app, firestoreSettings, dbId) 
  : initializeFirestore(app, firestoreSettings);

// Operation Types for Hardened Error Tracking
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

/**
 * Handles Firestore error mapping permissions & status for diagnosing of rules
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Error: ', JSON.stringify(errInfo));
  // Keep it as warnings instead of throwing so it doesn't break crucial flows
}

/**
 * Persists or updates the user profile record structure in Firestore
 */
export async function syncUserProfile(
  userId: string, 
  phoneNumber: string, 
  fullName: string = '', 
  isPremium: boolean = false, 
  premiumExpiry: number = 0
) {
  // Always update locally as fallback first
  const localPayload = {
    userId,
    phoneNumber,
    fullName,
    isPremium,
    premiumExpiry,
    updatedAt: Date.now()
  };
  localStorage.setItem(`profile_${userId}`, JSON.stringify(localPayload));

  const userDocRef = doc(db, 'users', userId);
  try {
    const userSnap = await getDoc(userDocRef);
    if (!userSnap.exists()) {
      // Create user profile
      const payload = {
        userId,
        phoneNumber,
        fullName,
        createdAt: serverTimestamp(),
        isPremium,
        premiumExpiry
      };
      await setDoc(userDocRef, payload);
    } else {
      // Sync or update profile (e.g. if purchase happened, update values)
      const data = userSnap.data();
      const payload: Record<string, any> = {};
      
      if (fullName && data.fullName !== fullName) {
        payload.fullName = fullName;
      }
      
      // Preserve local premium status if bought on bazaar
      if (isPremium && !data.isPremium) {
        payload.isPremium = isPremium;
        payload.premiumExpiry = premiumExpiry;
      }
      
      if (Object.keys(payload).length > 0) {
        await updateDoc(userDocRef, payload);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
  }
}

/**
 * Pulls the user profile metadata from Firestore
 */
export async function getUserProfile(userId: string) {
  const userDocRef = doc(db, 'users', userId);
  try {
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const data = snap.data();
      // Keep local copy fresh
      localStorage.setItem(`profile_${userId}`, JSON.stringify({
        userId,
        phoneNumber: data.phoneNumber || '',
        fullName: data.fullName || '',
        isPremium: data.isPremium || false,
        premiumExpiry: data.premiumExpiry || 0,
        updatedAt: Date.now()
      }));
      return data;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${userId}`);
  }

  // Fallback to local storage
  const localData = localStorage.getItem(`profile_${userId}`);
  if (localData) {
    try {
      return JSON.parse(localData);
    } catch {
      // ignore
    }
  }

  // Return a generated guest/blank profile so caller doesn't crash
  return {
    userId,
    phoneNumber: '',
    fullName: '',
    isPremium: localStorage.getItem('isPremium') === 'true',
    premiumExpiry: Number(localStorage.getItem('premium_expiry')) || 0
  };
}
