import { BoundingBox, linesIntersect, scalePoint } from "./geometry";
import Line from "./components/Line.svelte";
import TextBox from "./components/TextBox.svelte";

export interface PlainCanvasElementData {
    type: string;
    fields: Record<string, any>;
}

export abstract class CanvasElementData {
    // A unique identifier
    readonly id: string;
    // Whether the mouse is currently over this element
    mouseIsOver: boolean = false;

    constructor(id?: string) {
        this.id = id ?? crypto.randomUUID();
    }

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

    // Convert to serializable format. Result should contain two fields:
    // type: string (same as the class name)
    // fields: any (containing the relevant data for the type)
    abstract toPlain(): PlainCanvasElementData;

    // Deserialize from JSON format
    static fromPlain({ type, fields }: PlainCanvasElementData) {
        switch (type) {
            case "LineData":
                return new LineData(fields.points, fields.color, fields.width, fields.style, fields.id);
            case "TextBoxData":
                return new TextBoxData(
                    fields.text,
                    new BoundingBox(
                        fields.x0,
                        fields.y0,
                        fields.x1,
                        fields.y1
                    ),
                    fields.color,
                    fields.fontSize,
                    fields.fontFace,
                    fields.id
                );
            default:
                throw new Error(`Unknown element type when deserializing: ${type}`);
        }
    }
}

export class LineData extends CanvasElementData {
    constructor(
        public points: number[],
        public color: string,
        public width: number,
        public style: "solid" | "dash",
        id?: string
    ) {
        super(id);
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

    toPlain() {
        return {
            type: "LineData",
            fields: {
                points: this.points,
                color: this.color,
                width: this.width,
                style: this.style,
                id: this.id,
            },
        };
    }
}

export class TextBoxData extends CanvasElementData {
    static MIN_WIDTH_FACTOR = 12;
    static MIN_HEIGHT_FACTOR = 8;

    constructor(
        public text: string,
        public bounds: BoundingBox,
        public color: string,
        public fontSize: number,
        public fontFace: string,
        id?: string
    ) {
        super(id);
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

    // Modifies self in-place to have at least the minimum width and height
    // Returns self
    setMinimumSize() {
        const { width, height } = this.bounds.dimensions();
        const minWidth = TextBoxData.MIN_WIDTH_FACTOR * this.fontSize;
        const minHeight =
            TextBoxData.MIN_HEIGHT_FACTOR * this.fontSize;
        if (width < minWidth || height < minHeight) {
            this.bounds.x1 = this.bounds.x0 + minWidth;
            this.bounds.y1 = this.bounds.y0 + minHeight;
        }
        return this;
    }

    toPlain() {
        return {
            type: "TextBoxData",
            fields: {
                text: this.text,
                x0: this.bounds.x0,
                y0: this.bounds.y0,
                x1: this.bounds.x1,
                y1: this.bounds.y1,
                color: this.color,
                fontSize: this.fontSize,
                fontFace: this.fontFace,
                id: this.id,
            },
        };
    }

    // Return a deep copy of the text box data
    clone() {
        return new TextBoxData(
            this.text,
            this.bounds.clone(),
            this.color,
            this.fontSize,
            this.fontFace,
            this.id
        );
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
