/**
 * Firebase Configuration Scaffold
 *
 * To connect to Firebase:
 * 1. Create a Firebase project at https://console.firebase.google.com
 * 2. Enable Authentication (Google, Apple, Email/Password)
 * 3. Create a Cloud Firestore database
 * 4. Replace the config below with your project's config
 * 5. Uncomment the imports and initialization code
 */

// import { initializeApp } from 'firebase/app';
// import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
// import { getFirestore, collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

// const app = initializeApp(firebaseConfig);
// const auth = getAuth(app);
// const db = getFirestore(app);

/**
 * When ready to connect Firebase, the store.tsx should be updated to:
 *
 * 1. Replace localStorage reads with Firestore onSnapshot listeners
 *    - Subscribe to `households/{householdId}/tools` collection
 *    - Subscribe to `households/{householdId}/kits` collection
 *
 * 2. Replace localStorage writes with Firestore setDoc calls
 *    - Each tool update writes to `households/{householdId}/tools/{toolId}`
 *    - Each kit update writes to `households/{householdId}/kits/{kitId}`
 *
 * 3. Add authentication flow:
 *    - Show sign-in screen if not authenticated
 *    - After sign-in, load user's household
 *    - If no household, show create/join screen
 *
 * Firestore Security Rules (deploy to Firebase):
 *
 * rules_version = '2';
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *     match /users/{userId} {
 *       allow read, write: if request.auth.uid == userId;
 *     }
 *     match /households/{householdId} {
 *       allow read: if request.auth.uid in resource.data.memberIds;
 *       allow write: if request.auth.uid == resource.data.ownerId
 *         || request.auth.uid in resource.data.memberIds;
 *       match /{subcollection}/{docId} {
 *         allow read, write: if request.auth.uid in
 *           get(/databases/$(database)/documents/households/$(householdId)).data.memberIds;
 *       }
 *     }
 *   }
 * }
 */

export { firebaseConfig };
