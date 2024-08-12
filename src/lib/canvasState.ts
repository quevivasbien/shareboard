import * as Konva from "svelte-konva";
import { LineData, SelectionData, TextBoxData, type CanvasElementData } from "$lib/canvasElements";
import { BoundingBox, getBoundsAfterResize } from "$lib/geometry";

export interface ToolState {
    activeTool: string;
    size: number;
    color: string;
}

type actionType = "draw" | "erase" | "move" | "resize";

interface CanvasAction {
    type: actionType;
    payload: any;
}

class CanvasHistory {
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

export class CanvasState {
    // Location of the mouse within the canvas
    mousePosition: { x: number; y: number } = { x: 0, y: 0 };
    // Whether or not mouse button is currently pressed
    mouseIsDown: boolean = false;
    // Used to track a recent mouse position for making changes with e.g. the eraser or a selection
    lastMousePos: { x: number, y: number } | null = null;
    // Elements currently displayed on the canvas
    elements: CanvasElementData[] = [];
    // Elements displayed on the canvas that are currently selected
    selectedElements: CanvasElementData[] = [];
    // A line that is currently being drawn
    currentLine: LineData | null = null;
    // A text box that is currently being edited
    currentTextBox: TextBoxData | null = null;
    // A selection that is actively being created (being dragged out)
    currentSelection: SelectionData | null = null;
    // Whether the mouse is currently hovering over a selection
    // If hovering, describes where the mouse is within the selection
    //   using format `{horizontal}-{vertical}`
    mouseOverSelection: string | null = null;
    // Whether a selection is being manipulated
    // If being manipulated, describes the type of manipulation,
    // One of: "move", "resize:{horizontal}-{vertical}"
    selectionMode: string | null = null;
    // The background color of the canvas
    backgroundColor: string = "white";
    // Keeps track of recent edits to the canvas
    history: CanvasHistory = new CanvasHistory();

    contructor() {}

    makeSelections() {
        if (!this.currentSelection) {
            return;
        }
        const selectedIdxs = [];
        const unselectedIdxs = [];
        for (let i = 0; i < this.elements.length; i++) {
            const element = this.elements[i];
            if (this.currentSelection.contains(element)) {
                selectedIdxs.push(i);
            } else {
                unselectedIdxs.push(i);
            }
        }
        this.selectedElements = selectedIdxs.map(
            (i) => this.elements[i],
        );
        this.elements = unselectedIdxs.map(
            (i) => this.elements[i],
        );
        this.currentSelection = null;
    }

    clearSelections() {
        this.elements = this.elements.concat(
            this.selectedElements,
        );
        this.selectedElements = [];
    }

    moveSelections() {
        if (!this.lastMousePos) {
            throw new Error("Tried to move selection without active selection origin.");
        }
        const dx = this.mousePosition.x - this.lastMousePos.x;
        const dy = this.mousePosition.y - this.lastMousePos.y;
        this.selectedElements = this.selectedElements.map((e) => {
            return e.move(dx, dy);
        });
        this.history.add(
            "move",
            {
                elements: this.selectedElements,
                dx,
                dy,
            }
        );
    }

    resizeSelections() {
        if (!this.selectionMode) {
            throw new Error("Tried to resize selection without active selection mode");
        }
        const mode = this.selectionMode.split(":");
        if (mode.length !== 2) {
            return;
        }
        const [horizSource, vertSource] = mode[1].split("-");
        const boundsBefore = BoundingBox.union(this.selectedElements.map((e) => e.boundingBox()));
        const boundsAfter = getBoundsAfterResize(boundsBefore, this.mousePosition, horizSource, vertSource);
        this.selectedElements = this.selectedElements.map((e) => {
            return e.scale(boundsBefore, boundsAfter);
        });
        this.history.add(
            "resize",
            {
                elements: this.selectedElements,
                boundsBefore,
                boundsAfter,
            }
        );
    }

    deleteSelections() {
        this.selectedElements = [];
    }

    handleMousedown(e: Konva.KonvaMouseEvent, toolState: ToolState) {
        const event = e.detail;
        const pos = event.target.getStage()?.getPointerPosition();
        if (!pos) {
            return;
        }
        this.mouseIsDown = true;
        // Deactivate current text box if one is active
        if (this.currentTextBox) {
            this.elements = [
                ...this.elements,
                this.currentTextBox,
            ];
            this.history.add("draw", this.currentTextBox);
            this.currentTextBox = null;
        }
        // Remove current selection if one is active and not being moved
        if (this.selectedElements.length !== 0 && !this.mouseOverSelection) {
            this.clearSelections();
        }
        switch (toolState.activeTool) {
            case "pencil":
                this.currentLine = new LineData(
                    [pos.x, pos.y],
                    toolState.color,
                    toolState.size,
                );
                break;
            
            case "line":
                this.currentLine = new LineData(
                    [pos.x, pos.y, pos.x, pos.y],
                    toolState.color,
                    toolState.size,
                );
                break;
            
            case "eraser":
                this.lastMousePos = pos;
                break;

            case "text":
                this.currentTextBox = new TextBoxData(
                    "",
                    new BoundingBox(pos.x, pos.y, pos.x, pos.y),
                    toolState.color,
                );
                break;

            case "selection":
                if (this.mouseOverSelection) {
                    this.lastMousePos = pos;
                } else {
                    this.currentSelection = new SelectionData(
                        new BoundingBox(pos.x, pos.y, pos.x, pos.y)
                    );
                }
                break;

            default:
                break;
        }
    }

    handleMousemove(e: Konva.KonvaMouseEvent, toolState: ToolState) {
        const event = e.detail;
        const pos = event.target.getStage()?.getPointerPosition();
        if (!pos) {
            return;
        }
        this.mousePosition = pos;
        if (!this.mouseIsDown) {
            return;
        }

        switch (toolState.activeTool) {
            case "pencil":
                if (!this.currentLine) {
                    return;
                }
                this.currentLine.points = [
                    ...this.currentLine.points,
                    pos.x,
                    pos.y,
                ];
                break;

            case "line":
                if (!this.currentLine) {
                    return;
                }
                const startX = this.currentLine.points[0];
                const startY = this.currentLine.points[1];
                // If line is close to straight, lock to straight
                const slope = (startY - pos.y) / (startX - pos.x);
                const slopeTol = 40;
                if (Math.abs(slope) < 1 / slopeTol) {
                    this.currentLine.points = [
                        startX,
                        startY,
                        pos.x,
                        startY,
                    ];
                } else if (Math.abs(slope) > slopeTol) {
                    this.currentLine.points = [
                        startX,
                        startY,
                        startX,
                        pos.y,
                    ];
                } else {
                    this.currentLine.points = [startX, startY, pos.x, pos.y];
                }
                break;

            case "eraser":
                if (!this.lastMousePos) {
                    return;
                }
                const ax = this.lastMousePos.x;
                const ay = this.lastMousePos.y;
                const bx = pos.x;
                const by = pos.y;
                // Look for elements that intersect line AB
                this.elements = this.elements.filter((element) => {
                    if (element.intersects([ax, ay, bx, by])) {
                        this.history.add("erase", element);
                        return false;
                    }
                    return true;
                });
                break;

            case "text":
                if (!this.currentTextBox) {
                    return;
                }
                this.currentTextBox.bounds.x1 = pos.x;
                this.currentTextBox.bounds.y1 = pos.y;
                break;
                
            case "selection":
                if (this.currentSelection) {
                    this.currentSelection.bounds.x1 = pos.x;
                    this.currentSelection.bounds.y1 = pos.y;
                }
                break;

            default:
                break;
        }
    }

    handleMouseup(e: Konva.KonvaMouseEvent, toolState: ToolState) {
        this.mouseIsDown = false;
        if (toolState.activeTool === "pencil" || toolState.activeTool === "line") {
            if (!this.currentLine) {
                return;
            }
            this.elements = [
                ...this.elements,
                this.currentLine,
            ];
            this.history.add("draw", this.currentLine);
            this.currentLine = null;
        } else if (toolState.activeTool === "eraser") {
            this.lastMousePos = null;
        } else if (toolState.activeTool === "selection") {
            if (this.lastMousePos) {
                if (this.selectionMode === "move") {
                    this.moveSelections();
                }
                else {
                    this.resizeSelections();
                }
                this.lastMousePos = null;
            }
            this.makeSelections();
        }
    }


    undo() {
        const lastAction = this.history.pop();
        if (lastAction) {
            if (lastAction.type === "draw") {
                this.elements = this.elements.filter(
                    (element) => element !== lastAction.payload,
                );
            } else if (lastAction.type === "erase") {
                this.elements = [
                    ...this.elements,
                    lastAction.payload as CanvasElementData,
                ];
            } else if (lastAction.type === "move") {
                const { elements, dx, dy } = lastAction.payload;
                this.elements = this.elements.map((e) => {
                    if (elements.includes(e)) {
                        return e.move(-dx, -dy);
                    } else {
                        return e;
                    }
                });
            } else if (lastAction.type === "resize") {
                const { elements, boundsBefore, boundsAfter } = lastAction.payload;
                this.elements = this.elements.map((e) => {
                    if (elements.includes(e)) {
                        return e.scale(boundsAfter, boundsBefore);
                    } else {
                        return e;
                    }
                });
            }
        }
    }

    handleKeydown(event: KeyboardEvent) {
        if (this.currentTextBox) {
            event.preventDefault();
            if (event.key === "Enter") {
                this.currentTextBox.text += "\n";
            } else if (event.key === "Backspace") {
                this.currentTextBox.text =
                    this.currentTextBox.text.slice(0, -1);
            } else if (event.key === "Escape") {
                this.currentTextBox = null;
            }
            // If key is a printable character, add it to the text
            else if (event.key.length === 1) {
                this.currentTextBox.text += event.key;
            }
        }
        // Capture Ctrl+Z
        else if (event.ctrlKey && event.key === "z") {
            this.undo();
        }
        // Capture delete selection
        else if (
            this.selectedElements.length !== 0 &&
            event.key === "Delete"
        ) {
            this.deleteSelections();
        }
    }
}
