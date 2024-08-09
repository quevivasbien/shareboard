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