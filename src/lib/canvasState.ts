import { get } from "svelte/store";
import { CanvasElementData, type PlainCanvasElementData } from "./canvasElements";
import { userStore } from "./stores";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { BoundingBox } from "./geometry";

type CanvasAction = {
    type: "draw",
    // Contains element to be drawn
    payload: CanvasElementData
} | {
    type: "erase",
    // Contains elements to be erased
    payload: CanvasElementData[]
} | {
    type: "move",
    // Contains elements to be moved, along with the offset
    payload: {
        elements: CanvasElementData[],
        dx: number,
        dy: number
    }
} | {
    type: "resize",
    // Contains elements to be resized, along with the the selection bounds before and after resizing
    payload: {
        elements: CanvasElementData[],
        boundsBefore: BoundingBox,
        boundsAfter: BoundingBox
    }
} | {
    type: "update",
    // Contains *previous state* of element to be updated
    payload: CanvasElementData,
}

export class CanvasHistory {
    memorySize = 50;
    private actions: CanvasAction[] = [];
    empty: boolean = true;

    add(action: CanvasAction) {
        this.actions.push(action);
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

export type DataChannelMessage = {
    type: "draw",
    // Contains list of elements to be drawn
    payload: PlainCanvasElementData[]
} | {
    type: "erase",
    // Contains *ids* of elements to be erased
    payload: string[]
} | {
    type: "move",
    // Contains ids of elements to be moved, along with the offset
    payload: {
        ids: string[],
        dx: number,
        dy: number
    }
} | {
    type: "resize",
    // Contains ids of elements to be resized, along with the the selection bounds before and after resizing
    payload: {
        ids: string[],
        boundsBefore: { x0: number, y0: number, x1: number, y1: number },
        boundsAfter: { x0: number, y0: number, x1: number, y1: number }
    }
} | {
    type: "update",
    // Contains *new state* of element to be updated
    payload: PlainCanvasElementData,
} | {
    type: "initialState",
    // Contains list of all elements on host's canvas
    payload: PlainCanvasElementData[],
}
