// src/firebase/config.js

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// هذا هو الكود الذي نسخته من لوحة تحكم Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAFYNKXFKNl-5pVcaG1avb_QyHHgtZ28sQ",
  authDomain: "facility-flow-nexus-backend.firebaseapp.com",
  projectId: "facility-flow-nexus-backend",
  storageBucket: "facility-flow-nexus-backend.firebasestorage.app",
  messagingSenderId: "964109920408",
  appId: "1:964109920408:web:b591794e78b7ebc89608ed",
  measurementId: "G-KD76NDH80Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const db = getFirestore(app);

// Export both app and db for use in other parts of the application
export { app, db };