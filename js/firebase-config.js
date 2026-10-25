/**
 * Peachy Maja — Connected Live Firebase Configuration
 */

window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyAvtfk46Bai1eidUNjaRArZUyZijNc4DJw",
  authDomain: "peachy-maja.firebaseapp.com",
  databaseURL: "https://peachy-maja-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "peachy-maja",
  storageBucket: "peachy-maja.firebasestorage.app",
  messagingSenderId: "655218214638",
  appId: "1:655218214638:web:0fa8e16a00eccbc582d5ff"
};

// Check if live Firebase credentials have been configured
window.isFirebaseConfigured = function() {
  return window.FIREBASE_CONFIG && 
         window.FIREBASE_CONFIG.apiKey && 
         window.FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY_HERE" &&
         window.FIREBASE_CONFIG.apiKey.startsWith("AIzaSy");
};
