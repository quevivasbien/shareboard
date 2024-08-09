import { linesIntersect, pointWithinBox } from "./geometry";

export class CanvasElementData {
    constructor(
        public selected: boolean,
    ) {} 
}

export class LineData extends CanvasElementData {
    constructor(
        public points: number[],
        public color: string,
        public width: number,
        selected: boolean = false
    ) {
        super(selected);
    }

    intersects(line: [number, number, number, number]) {
        for (let j = 0; j < this.points.length - 2; j += 2) {
            const cx = this.points[j];
            const cy = this.points[j + 1];
            const dx = this.points[j + 2];
            const dy = this.points[j + 3];
            if (linesIntersect(...line, cx, cy, dx, dy)) {
                return true;
            }
        }
        return false;
    }

    containedBy(selection: SelectionData) {
        for (let i = 0; i < this.points.length - 2; i += 2) {
            const cx = this.points[i];
            const cy = this.points[i + 1];
            if (!selection.contains([cx, cy])) {
                return false;
            }
        }
        return true;
    }

    boundingBox() {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (let i = 0; i < this.points.length - 2; i += 2) {
            const x = this.points[i];
            const y = this.points[i + 1];
            if (x < minX) {
                minX = x;
            }
            if (y < minY) {
                minY = y;
            }
            if (x > maxX) {
                maxX = x;
            }
            if (y > maxY) {
                maxY = y;
            }
        }

        return new SelectionData(minX, minY, maxX - minX, maxY - minY);
    }
}

export class TextBoxData extends CanvasElementData {
    constructor(
        public text: string,
        public x: number,
        public y: number,
        public width: number,
        public height: number,
        public color: string,
        public selected: boolean = false,
    ) {
        super(selected);
    }
}

export class SelectionData {
    constructor(
        public x: number,
        public y: number,
        public width: number,
        public height: number
    ) {
        
    }

    contains(point: [number, number]) {
        return pointWithinBox(
            point[0], point[1],
            this.x, this.y,
            this.x + this.width, this.y + this.height
        );
    }
}

type actionType = "draw" | "erase" | "move";

export interface CanvasAction {
    type: actionType;
    element: CanvasElementData;
}

export class CanvasHistory {
    memorySize = 30;
    actions: CanvasAction[] = [];

    add(type: actionType, element: CanvasElementData) {
        this.actions.push({ type, element });
        if (this.actions.length > this.memorySize) {
            this.actions.shift();
        }
    }
}