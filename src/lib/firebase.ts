// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = { 
    apiKey: "AIzaSyC1-YxpYHgJbTp2OGd1cLesvIk4Kc_8bL4", 
    authDomain: "fiberflex-coupons.firebaseapp.com", 
    projectId: "fiberflex-coupons", 
    storageBucket: "fiberflex-coupons.appspot.com", 
    messagingSenderId: "822507312207", 
    appId: "1:822507312207:web:77a1348c8df958bab1863a"
};


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db };
