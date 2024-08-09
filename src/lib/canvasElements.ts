import { BoundingBox, linesIntersect } from "./geometry";
import Line from "./components/Line.svelte";
import TextBox from "./components/TextBox.svelte";

export abstract class CanvasElementData {
    constructor() {}
    
    // Determine whether the line AB intersects this element
    // Input takes the form [Ax, Ay, Bx, By]
    intersects(line: [number, number, number, number]) {
        return false;
    }

    abstract boundingBox(): BoundingBox;

    // Get the element's Svelte component type
    abstract componentType(): any;

    // Move the element in-place and return it
    abstract move(dx: number, dy: number): CanvasElementData;
}

export class LineData extends CanvasElementData {
    constructor(
        public points: number[],
        public color: string,
        public width: number,
    ) {
        super();
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

    boundingBox() {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (let i = 0; i < this.points.length; i += 2) {
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

        return new BoundingBox(minX, minY, maxX, maxY);
    }

    componentType() {
        return Line;
    }

    move(dx: number, dy: number) {
        for (let i = 0; i < this.points.length; i += 2) {
            this.points[i] += dx;
            this.points[i + 1] += dy;
        }

        return this;
    }
}

export class TextBoxData extends CanvasElementData {
    constructor(
        public text: string,
        public bounds: BoundingBox,
        public color: string,
    ) {
        super();
    }

    componentType() {
        return TextBox;
    }

    boundingBox(): BoundingBox {
        return this.bounds;
    }

    move(dx: number, dy: number) {
        this.bounds = this.bounds.translate(dx, dy);
        return this;
    }
}

export class SelectionData {
    constructor(
        public bounds: BoundingBox,
        public contents: CanvasElementData[] = [],
    ) {}

    contains(element: CanvasElementData) {
        return this.bounds.contains(element.boundingBox());
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