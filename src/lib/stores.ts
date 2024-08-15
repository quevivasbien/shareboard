import { writable } from "svelte/store";

export interface ToolState {
    activeTool: string;
    size: number;
    color: string;
    style: "solid" | "dash";
    fontSize: number;
}

export const toolStateStore = writable<ToolState>({
    activeTool: "pencil",
    size: 3,
    color: "#000000",
    style: "solid",
    fontSize: 24,
});

export const textBoxInputStore = writable<HTMLTextAreaElement | null>(null);