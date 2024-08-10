<script lang="ts">
    import { BxUndo } from "svelte-boxicons";
    import * as Konva from "svelte-konva";

    import {
        CanvasElementData,
        CanvasHistory,
        LineData,
        SelectionData,
        TextBoxData,
        type CanvasState,
    } from "$lib/canvasElements";
    import { BoundingBox } from "$lib/geometry";
    import ToolSelectMenu from "$lib/components/ToolSelectMenu.svelte";
    import PencilOptionsMenu from "$lib/components/PencilOptionsMenu.svelte";
    import Canvas from "$lib/components/Canvas.svelte";

    const canvasState: CanvasState = {
        cursorPosition: { x: 0, y: 0 },
        elements: [],
        selectedElements: [],
        currentLine: null,
        currentTextBox: null,
        currentSelection: null,
        backgroundColor: "white",
    };

    let eraseStartPos: { x: number; y: number } | null = null;

    let history = new CanvasHistory();
    let historyEmpty = true;

    // Whether or not mouse button is currently pressed
    let mouseIsDown = false;
    // The current selected tool
    let activeTool = "pencil";
    // Whether the mouse is hovering over an active selection
    let mouseOverSelection = false;

    // When moving a selection, where the mouse was when the move started
    let selectionMoveOrigin: { x: number; y: number } | null = null;

    let cursorType: string;
    $: {
        if (activeTool === "line") {
            cursorType = "crosshair";
        } else if (activeTool === "selection") {
            cursorType = mouseOverSelection ? "grab" : "auto";
        } else {
            cursorType = activeTool;
        }
    }

    let lineColor: string = "black";
    let lineWidth: number = 3;

    function makeSelections() {
        if (!canvasState.currentSelection) {
            return;
        }
        const selectedIdxs = [];
        const unselectedIdxs = [];
        for (let i = 0; i < canvasState.elements.length; i++) {
            const element = canvasState.elements[i];
            if (canvasState.currentSelection.contains(element)) {
                selectedIdxs.push(i);
            } else {
                unselectedIdxs.push(i);
            }
        }
        canvasState.selectedElements = selectedIdxs.map(
            (i) => canvasState.elements[i],
        );
        canvasState.elements = unselectedIdxs.map(
            (i) => canvasState.elements[i],
        );
        canvasState.currentSelection = null;
    }

    function clearSelections() {
        canvasState.elements = canvasState.elements.concat(
            canvasState.selectedElements,
        );
        canvasState.selectedElements = [];
    }

    function moveSelections(origin: { x: number; y: number }) {
        const dx = canvasState.cursorPosition.x - origin.x;
        const dy = canvasState.cursorPosition.y - origin.y;
        canvasState.selectedElements = canvasState.selectedElements.map((e) => {
            return e.move(dx, dy);
        });
        history.add(
            "move",
            {
                elements: canvasState.selectedElements,
                dx,
                dy,
            }
        );
        historyEmpty = false;
    }

    function deleteSelections() {
        canvasState.selectedElements = [];
    }

    function handleMousedown(e: Konva.KonvaMouseEvent) {
        const event = e.detail;
        const pos = event.target.getStage()?.getPointerPosition();
        if (!pos) {
            return;
        }
        mouseIsDown = true;
        // Deactivate current text box if one is active
        if (canvasState.currentTextBox) {
            canvasState.elements = [
                ...canvasState.elements,
                canvasState.currentTextBox,
            ];
            history.add("draw", canvasState.currentTextBox);
            historyEmpty = false;
            canvasState.currentTextBox = null;
        }
        // Remove current selection if one is active and not being moved
        if (canvasState.selectedElements.length !== 0 && !mouseOverSelection) {
            clearSelections();
        }
        if (activeTool === "pencil") {
            canvasState.currentLine = new LineData(
                [pos.x, pos.y],
                lineColor,
                lineWidth,
            );
        } else if (activeTool === "line") {
            canvasState.currentLine = new LineData(
                [pos.x, pos.y, pos.x, pos.y],
                lineColor,
                lineWidth,
            );
        } else if (activeTool === "eraser") {
            eraseStartPos = pos;
        } else if (activeTool === "text") {
            canvasState.currentTextBox = new TextBoxData(
                "",
                new BoundingBox(pos.x, pos.y, pos.x, pos.y),
                lineColor,
            );
        } else if (activeTool === "selection") {
            if (mouseOverSelection) {
                selectionMoveOrigin = pos;
            } else {
                canvasState.currentSelection = new SelectionData(
                    new BoundingBox(pos.x, pos.y, pos.x, pos.y),
                );
            }
        }
    }

    function handleMousemove(e: Konva.KonvaMouseEvent) {
        const event = e.detail;
        const pos = event.target.getStage()?.getPointerPosition();
        if (!pos) {
            return;
        }
        canvasState.cursorPosition = pos;
        if (!mouseIsDown) {
            return;
        }
        if (activeTool === "pencil") {
            if (!canvasState.currentLine) {
                return;
            }
            canvasState.currentLine.points = [
                ...canvasState.currentLine.points,
                pos.x,
                pos.y,
            ];
        } else if (activeTool === "line") {
            if (!canvasState.currentLine) {
                return;
            }
            const startX = canvasState.currentLine.points[0];
            const startY = canvasState.currentLine.points[1];
            // If line is close to straight, lock to straight
            const slope = (startY - pos.y) / (startX - pos.x);
            const slopeTol = 40;
            if (Math.abs(slope) < 1 / slopeTol) {
                canvasState.currentLine.points = [
                    startX,
                    startY,
                    pos.x,
                    startY,
                ];
            } else if (Math.abs(slope) > slopeTol) {
                canvasState.currentLine.points = [
                    startX,
                    startY,
                    startX,
                    pos.y,
                ];
            } else {
                canvasState.currentLine.points = [startX, startY, pos.x, pos.y];
            }
        } else if (activeTool === "eraser") {
            if (!eraseStartPos) {
                return;
            }
            const ax = eraseStartPos.x;
            const ay = eraseStartPos.y;
            const bx = pos.x;
            const by = pos.y;
            // Look for elements that intersect line AB
            canvasState.elements = canvasState.elements.filter((element) => {
                if (element.intersects([ax, ay, bx, by])) {
                    history.add("erase", element);
                    historyEmpty = false;
                    return false;
                }
                return true;
            });
        } else if (activeTool === "text") {
            if (!canvasState.currentTextBox) {
                return;
            }
            canvasState.currentTextBox.bounds.x1 = pos.x;
            canvasState.currentTextBox.bounds.y1 = pos.y;
        } else if (activeTool === "selection") {
            if (canvasState.currentSelection) {
                canvasState.currentSelection.bounds.x1 = pos.x;
                canvasState.currentSelection.bounds.y1 = pos.y;
            }
        }
    }

    function handleMouseup(e: Konva.KonvaMouseEvent) {
        mouseIsDown = false;
        if (activeTool === "pencil" || activeTool === "line") {
            if (!canvasState.currentLine) {
                return;
            }
            canvasState.elements = [
                ...canvasState.elements,
                canvasState.currentLine,
            ];
            history.add("draw", canvasState.currentLine);
            historyEmpty = false;
            canvasState.currentLine = null;
        } else if (activeTool === "eraser") {
            eraseStartPos = null;
        } else if (activeTool === "selection") {
            if (selectionMoveOrigin) {
                moveSelections(selectionMoveOrigin);
                selectionMoveOrigin = null;
            }
            makeSelections();
        }
    }

    function undo() {
        const lastAction = history.actions.pop();
        if (lastAction) {
            if (lastAction.type === "draw") {
                canvasState.elements = canvasState.elements.filter(
                    (element) => element !== lastAction.payload,
                );
            } else if (lastAction.type === "erase") {
                canvasState.elements = [
                    ...canvasState.elements,
                    lastAction.payload as CanvasElementData,
                ];
            } else if (lastAction.type === "move") {
                const { elements, dx, dy } = lastAction.payload;
                canvasState.elements = canvasState.elements.map((e) => {
                    if (elements.includes(e)) {
                        return e.move(-dx, -dy);
                    } else {
                        return e;
                    }
                });
            }
        }
        historyEmpty = history.actions.length === 0;
    }

    // Capture key presses for active text box
    window.addEventListener("keydown", (event) => {
        if (canvasState.currentTextBox) {
            event.preventDefault();
            if (event.key === "Enter") {
                canvasState.currentTextBox.text += "\n";
            } else if (event.key === "Backspace") {
                canvasState.currentTextBox.text =
                    canvasState.currentTextBox.text.slice(0, -1);
            } else if (event.key === "Escape") {
                canvasState.currentTextBox = null;
            }
            // If key is a printable character, add it to the text
            else if (event.key.length === 1) {
                canvasState.currentTextBox.text += event.key;
            }
        }

        // Capture Ctrl+Z
        else if (event.ctrlKey && event.key === "z") {
            undo();
        }
        // Capture delete selection
        else if (
            canvasState.selectedElements.length !== 0 &&
            event.key === "Delete"
        ) {
            deleteSelections();
        }
    });
</script>

<div class="flex flex-row gap-8 p-2 items-center border-b drop-shadow">
    <ToolSelectMenu bind:activeTool />
    <label class="flex flex-row gap-2 items-center">
        <!-- <span>Color:</span> -->
        <input type="color" class="cursor-pointer" bind:value={lineColor} />
    </label>
    <PencilOptionsMenu bind:lineWidth />
    <button class={historyEmpty ? "text-gray-400" : ""} on:click={undo}
        ><BxUndo /></button
    >
</div>
<div class="flex flex-col h-screen bg-gray-100">
    <div class="overflow-scroll relative">
        <Canvas
            {canvasState}
            {cursorType}
            {handleMousedown}
            {handleMousemove}
            {handleMouseup}
            
            bind:mouseOverSelection
            {selectionMoveOrigin}
        />
    </div>
</div>


<!-- Just so other cursor types can be used -->
<div class="hidden cursor-pencil"></div>
<div class="hidden cursor-eraser"></div>
<div class="hidden cursor-crosshair"></div>
<div class="hidden cursor-text"></div>
<div class="hidden cursor-selection"></div>
<div class="hidden cursor-grab"></div>
