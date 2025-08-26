// Firebase configuration
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: "AIzaSyA6LoJKcgDPEtdwRTdvI0kQGSUhgDjBUT4",
  authDomain: "accesscode-e53dc.firebaseapp.com",
  databaseURL: "https://accesscode-e53dc-default-rtdb.firebaseio.com",
  projectId: "accesscode-e53dc",
  storageBucket: "accesscode-e53dc.firebasestorage.app",
  messagingSenderId: "559980640727",
  appId: "1:559980640727:web:4fce58a2df15061f757392",
  measurementId: "G-J70F1J8DBM",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database and get a reference to the service
export const database = getDatabase(app);

export default app;
