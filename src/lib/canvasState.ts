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
