import type { User } from "firebase/auth";
import { writable } from "svelte/store";

export interface ToolState {
    activeTool: string;
    size: number;
    color: string;
    style: "solid" | "dash";
    fontSize: number;
    fontFace: string;
}

export const textBoxInputStore = writable<HTMLTextAreaElement | null>(null);

export const userStore = writable<User | null>(null);

export const connectionStateStore = writable<RTCPeerConnectionState>("new");

export const userIsHostStore = writable(false);
