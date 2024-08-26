import { get } from "svelte/store";
import { CanvasElementData, type PlainCanvasElementData } from "./canvasElements";
import { userStore } from "./stores";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

type actionType = "draw" | "erase" | "move" | "resize";

interface CanvasAction {
    type: actionType;
    payload: any;
}

export class CanvasHistory {
    memorySize = 30;
    private actions: CanvasAction[] = [];
    empty: boolean = true;

    add(type: actionType, payload: any) {
        this.actions.push({ type, payload });
        if (this.actions.length > this.memorySize) {
            this.actions.shift();
        }
        this.empty = false;
    }

    pop() {
        const out = this.actions.pop();
        this.empty = this.actions.length === 0;
        return out;
    }
}

export function saveState(elements: CanvasElementData[]) {
    const user = get(userStore);
    if (!user) {
        throw new Error("Tried to save canvas state while not logged in");
    }
    const plainElements = elements.map((e) => e.toPlain());
    const state = {
        timeStamp: new Date().toISOString(),
        elements: plainElements
    };
    const docRef = doc(db, "canvas", user.uid);
    return setDoc(docRef, state);
}

export async function loadState() {
    const user = get(userStore);
    if (!user) {
        throw new Error("Tried to load canvas state while not logged in");
    }
    const docRef = doc(db, "canvas", user.uid);
    const snapshot = await getDoc(docRef)
    const data = snapshot.data();
    console.log("Got data:", data);
    if (!data) {
        return null;
    }
    return data.elements.map((e: PlainCanvasElementData) => CanvasElementData.fromPlain(e)) as CanvasElementData[];
}
