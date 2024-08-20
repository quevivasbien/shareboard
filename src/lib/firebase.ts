import { initializeApp } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { userStore } from "./stores";

const firebaseConfig = {
    apiKey: "AIzaSyDZYa8_KJAo46tPC2GReEaYx4pvvxrX73w",
    authDomain: "shareboard-b4d6c.firebaseapp.com",
    projectId: "shareboard-b4d6c",
    storageBucket: "shareboard-b4d6c.appspot.com",
    messagingSenderId: "25467170120",
    appId: "1:25467170120:web:ee0b79b4aa6ba46184177d",
};


const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
const auth = getAuth(app);

onAuthStateChanged(auth, (user) => {
    userStore.set(user);
});

export async function createUser(email: string, password: string) {
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        return null;
    }
    catch (error) {
        console.error("Problem creating user", error);
        return error;
    }
}

export async function login(email: string, password: string) {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        return null;
    }
    catch (error) {
        console.error("Problem logging in", error);
        return error;
    }
}

export async function logout() {
    try {
        await signOut(auth);
        return null;
    }
    catch (error) {
        console.error("Problem logging out", error);
        return error;
    }
}