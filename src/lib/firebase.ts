import { initializeApp } from 'firebase/app';
import { initializeFirestore, onSnapshotsInSync } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

// Using initializeFirestore with experimentalForceLongPolling for better reliability
// on restrictive networks (solves "hanging" writes)
export const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
});

// Monitor sync status
onSnapshotsInSync(db, () => {
    console.log('--- Firestore Snapshots are in sync with server ---');
});

