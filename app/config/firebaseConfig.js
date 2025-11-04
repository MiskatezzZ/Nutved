// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: "naveed-automation.firebaseapp.com",
  projectId: "naveed-automation",
  storageBucket: "naveed-automation.firebasestorage.app",
  messagingSenderId: "505453228567",
  appId: "1:505453228567:web:0ec1ea9bc546eaea4da252",
  measurementId: "G-S5DT6DX88J"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Firestore instance
export const db = getFirestore(app);
export default db;