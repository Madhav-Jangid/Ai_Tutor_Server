// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

const firebaseConfig = {
    apiKey: "AIzaSyDB3ML_U9In6w0IugIrsrr0yQhR4vh_azI",
    authDomain: "ai-tutor-167bb.firebaseapp.com",
    projectId: "ai-tutor-167bb",
    storageBucket: "ai-tutor-167bb.firebasestorage.app",
    messagingSenderId: "1009621335720",
    appId: "1:1009621335720:web:37a7453e4bf3ab9167cc9d",
    measurementId: "G-KYCJY6XGLV"
};

// Initialize Firebase
export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAnalytics = getAnalytics(firebaseApp);
export const auth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();