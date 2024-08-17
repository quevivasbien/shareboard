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