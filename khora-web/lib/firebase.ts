import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

const firebaseConfig = {
  projectId: "athanor-478307",
  appId: "1:826302016708:web:28bcdccce5a903851bed91",
  apiKey: "AIzaSyCriWcAgGj5JN_U2tPZV0U8dTrX2_bjhX4",
  authDomain: "athanor-478307.firebaseapp.com",
  storageBucket: "athanor-478307.firebasestorage.app",
  messagingSenderId: "826302016708",
  measurementId: ""
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
