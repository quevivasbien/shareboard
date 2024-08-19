import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDZYa8_KJAo46tPC2GReEaYx4pvvxrX73w",
    authDomain: "shareboard-b4d6c.firebaseapp.com",
    projectId: "shareboard-b4d6c",
    storageBucket: "shareboard-b4d6c.appspot.com",
    messagingSenderId: "25467170120",
    appId: "1:25467170120:web:ee0b79b4aa6ba46184177d",
};



export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
