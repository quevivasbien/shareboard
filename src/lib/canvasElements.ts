export interface FreeformLine {
    points: number[];
    color: string;
    width: number;
}

type CanvasObject = FreeformLine;
type actionType = "draw" | "erase";

export interface CanvasAction {
    type: actionType;
    object: CanvasObject;
}

export class CanvasHistory {
    memorySize = 30;
    actions: CanvasAction[] = [];

    add(type: actionType, object: CanvasObject) {
        this.actions.push({ type, object });
        if (this.actions.length > this.memorySize) {
            this.actions.shift();
        }
    }
}