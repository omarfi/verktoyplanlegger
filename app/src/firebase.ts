import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyB60MOAX5FhrL8kk6vo5VNEJ3tcsMHOfmM',
  authDomain: 'studio-3228592052-d52e3.firebaseapp.com',
  projectId: 'studio-3228592052-d52e3',
  storageBucket: 'studio-3228592052-d52e3.firebasestorage.app',
  messagingSenderId: '901049617430',
  appId: '1:901049617430:web:acc9211a9268c864f8f937',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
