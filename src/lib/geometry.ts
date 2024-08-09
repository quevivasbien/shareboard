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

    translate(dx: number, dy: number) {
        return new BoundingBox(
            this.x0 + dx,
            this.y0 + dy,
            this.x1 + dx,
            this.y1 + dy
        );
    }
}