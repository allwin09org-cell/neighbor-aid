import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  connectAuthEmulator,
  getAuth,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  connectFirestoreEmulator,
  getFirestore,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyC7cjulkw5077D2vaeBf4XlWxveRZ8Bz2Q",
    authDomain: "neighbor-aid-f1b63.firebaseapp.com",
    projectId: "neighbor-aid-f1b63",
    storageBucket: "neighbor-aid-f1b63.firebasestorage.app",
    messagingSenderId: "804298496224",
    appId: "1:804298496224:web:1f4889d78e7c53cbdf1885",
    measurementId: "G-2D6VXTYNGL"
  };
  
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const isUsingEmulators = ["localhost", "127.0.0.1"].includes(
  window.location.hostname
);

if (isUsingEmulators) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", {
    disableWarnings: true,
  });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
