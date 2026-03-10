import { initializeApp } from 'firebase/app';
import { initializeFirestore, memoryLocalCache, onSnapshotsInSync } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

// Diagnostic: Check for missing config in production
if (import.meta.env.PROD) {
    const missing = Object.entries(firebaseConfig)
        .filter(([_, v]) => !v)
        .map(([k]) => k);
    if (missing.length > 0) {
        console.error('🔥 CRITICAL: Missing Firebase Config on Vercel:', missing);
    }
}

// Disable local persistence to prevent "stuck" writes in IndexedDB
export const db = initializeFirestore(app, {
    localCache: memoryLocalCache()
});

// Monitor sync status
onSnapshotsInSync(db, () => {
    console.log('--- Firestore Snapshots are in sync with server ---');
});

