import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, initializeAuth } from "firebase/auth";
import * as firebaseAuth from "firebase/auth"; 
import { getDatabase } from "firebase/database"; // RTDB
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyD_w_HKZd5FqzYtMF-1BBvmEvkrEj3lxww",
  authDomain: "webgis-mdpl-d018f.firebaseapp.com",
  databaseURL: "https://webgis-mdpl-d018f-default-rtdb.firebaseio.com", // URL RTDB ANDA
  projectId: "webgis-mdpl-d018f",
  storageBucket: "webgis-mdpl-d018f.firebasestorage.app",
  messagingSenderId: "909770815720",
  appId: "1:909770815720:web:639f4ddb7106f0eb2cf15d",
  measurementId: "G-BMXVV0TCZT"
};

let app;
let auth;
let db; // Realtime DB Instance

if (!getApps().length) {
  app = initializeApp(firebaseConfig);

  if (Platform.OS === 'web') {
    auth = getAuth(app);
  } else {
    const reactNativePersistence = (firebaseAuth as any).getReactNativePersistence;
    if (reactNativePersistence) {
      auth = initializeAuth(app, {
        persistence: reactNativePersistence(ReactNativeAsyncStorage)
      });
    } else {
      auth = getAuth(app); 
    }
  }
  // Inisialisasi Database
  db = getDatabase(app);
} else {
  app = getApp();
  auth = getAuth(app);
  db = getDatabase(app);
}

export { auth, db };