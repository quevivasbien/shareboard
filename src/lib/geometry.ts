// Determines if three points are in clockwise order
function clockwise(
    ax: number, ay: number,
    bx: number, by: number,
    cx: number, cy: number
) {
    return (bx - ax) * (cy - ay) > (by - ay) * (cx - ax);
}

// Determines if lines AB and CD intersect
export function linesIntersect(
    ax: number, ay: number,
    bx: number, by: number,
    cx: number, cy: number,
    dx: number, dy: number
) {
    return (
        clockwise(ax, ay, cx, cy, dx, dy) !== clockwise(bx, by, cx, cy, dx, dy)
        && clockwise(ax, ay, bx, by, cx, cy) !== clockwise(ax, ay, bx, by, dx, dy)
    );
}

export class BoundingBox {

    constructor(
        public x0: number,
        public y0: number,
        public x1: number,
        public y1: number
    ) {}

    static empty() {
        return new BoundingBox(0, 0, 0, 0);
    }

    static from(bounds: BoundingBox) {
        return new BoundingBox(bounds.x0, bounds.y0, bounds.x1, bounds.y1);
    }

    static union(bounds: BoundingBox[]) {
        let x0 = Infinity;
        let y0 = Infinity;
        let x1 = -Infinity;
        let y1 = -Infinity;
        for (const b of bounds) {
            x0 = Math.min(x0, b.x0);
            y0 = Math.min(y0, b.y0);
            x1 = Math.max(x1, b.x1);
            y1 = Math.max(y1, b.y1);
        }
        return new BoundingBox(x0, y0, x1, y1);
    }

    containsPoint(point: { x: number; y: number }) {
        return this.x0 <= point.x && this.x1 >= point.x && this.y0 <= point.y && this.y1 >= point.y
    }

    contains(other: BoundingBox) {
        return(
            Math.min(this.x0, this.x1) <= Math.min(other.x0, other.x1) &&
            Math.max(this.x0, this.x1) >= Math.max(other.x0, other.x1) &&
            Math.min(this.y0, this.y1) <= Math.min(other.y0, other.y1) &&
            Math.max(this.y0, this.y1) >= Math.max(other.y0, other.y1)
        );
    }

    origin() {
        const x = Math.min(this.x0, this.x1);
        const y = Math.min(this.y0, this.y1);
        return { x, y };
    }

    dimensions() {
        const width = Math.abs(this.x1 - this.x0);
        const height = Math.abs(this.y1 - this.y0);
        return { width, height };
    }

    move(dx: number, dy: number) {
        return new BoundingBox(
            this.x0 + dx,
            this.y0 + dy,
            this.x1 + dx,
            this.y1 + dy
        );
    }

    scale(boundsBefore: BoundingBox, boundsAfter: BoundingBox) {
        const p0 = scalePoint({ x: this.x0, y: this.y0 }, boundsBefore, boundsAfter);
        const p1 = scalePoint({ x: this.x1, y: this.y1 }, boundsBefore, boundsAfter);
        return new BoundingBox(p0.x, p0.y, p1.x, p1.y);
    }
}

export function getBoundsAfterResize(
    boundsBefore: BoundingBox,
    cursorPosition: { x: number; y: number },
    horizSource: string,
    vertSource: string,
) {
    const bounds = BoundingBox.from(boundsBefore);
    if (horizSource === "left") {
        bounds.x0 = Math.min(bounds.x1 - 1, cursorPosition.x);
    } else if (horizSource === "right") {
        bounds.x1 = Math.max(bounds.x0 + 1, cursorPosition.x);
    }
    if (vertSource === "top") {
        bounds.y0 = Math.min(bounds.y1 - 1, cursorPosition.y);
    } else if (vertSource === "bottom") {
        bounds.y1 = Math.max(bounds.y0 + 1, cursorPosition.y);
    }
    return bounds;
}

export function scalePoint(
    point: { x: number; y: number },
    boundsBefore: BoundingBox,
    boundsAfter: BoundingBox
) {
    const dimsBefore = boundsBefore.dimensions();
    const dimsAfter = boundsAfter.dimensions();
    const originBefore = boundsBefore.origin();
    const originAfter = boundsAfter.origin();
    const dxBefore = point.x - originBefore.x;
    const dyBefore = point.y - originBefore.y;
    const dxAfter = dxBefore * (dimsAfter.width / dimsBefore.width);
    const dyAfter = dyBefore * (dimsAfter.height / dimsBefore.height);
    const x = originAfter.x + dxAfter;
    const y = originAfter.y + dyAfter;
    return { x, y };
}