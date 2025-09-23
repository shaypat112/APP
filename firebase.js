// firebase.js
// Import the functions you need from the Firebase SDKs
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';



// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBhK2Ove290cIKpHnxsiMdtlugyuhEldBs",
  authDomain: "shays-social-app.firebaseapp.com",
  projectId: "shays-social-app",
  storageBucket: "shays-social-app.firebasestorage.app",
  messagingSenderId: "454921050511",
  appId: "1:454921050511:web:dc9846aa821e0b9c7513fa"
};

const app = initializeApp(firebaseConfig);

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Export auth so you can import it in your screens
export { auth };