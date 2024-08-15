import { BoundingBox, linesIntersect, scalePoint } from "./geometry";
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

    // Scale the element in-place and return it
    // boundsBefore and boundsAfter are the bounding boxes for an encompassing selection
    abstract scale(boundsBefore: BoundingBox, boundsAfter: BoundingBox): CanvasElementData;
}

export class LineData extends CanvasElementData {
    constructor(
        public points: number[],
        public color: string,
        public width: number,
        public style: "solid" | "dash",
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

    scale(boundsBefore: BoundingBox, boundsAfter: BoundingBox) {
        for (let i = 0; i < this.points.length; i += 2) {
            const { x, y } = scalePoint({ x: this.points[i], y: this.points[i + 1] }, boundsBefore, boundsAfter);
            this.points[i] = x;
            this.points[i + 1] = y;
        }
        return this;
    }
}

export class TextBoxData extends CanvasElementData {
    constructor(
        public text: string,
        public bounds: BoundingBox,
        public color: string,
        public fontSize: number,
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
        this.bounds = this.bounds.move(dx, dy);
        return this;
    }

    scale(boundsBefore: BoundingBox, boundsAfter: BoundingBox) {
        this.bounds = this.bounds.scale(boundsBefore, boundsAfter);
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
