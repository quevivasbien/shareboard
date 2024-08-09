<script lang="ts">
    import { BxEraser, BxPencil, BxSelection, BxText, BxUndo } from "svelte-boxicons";
    import * as Konva from "svelte-konva";

    import { CanvasHistory, LineData, SelectionData, TextBoxData } from "$lib/canvasElements";
    import { linesIntersect } from "$lib/geometry";
    import Line from "./Line.svelte";
    import TextBox from "./TextBox.svelte";
    import Selection from "./Selection.svelte";

    const canvasState = {
        cursorPosition: { x: 0, y: 0 },
        lines: [] as LineData[],
        currentLine: null as LineData | null,
        textBoxes: [] as TextBoxData[],
        currentTextBox: null as TextBoxData | null,
        currentSelection: null as SelectionData | null,
        backgroundColor: "white",
    };

    let eraseStartPos: { x: number; y: number } | null = null;

    let history = new CanvasHistory();
    let historyEmpty = true;

    let mouseIsDown = false;
    let activeTool = "pencil";

    let lineColor: string = "black";
    let lineWidth: number = 3;

    const boardSize = {
        width: 1600,
        height: 1600,
    };

    function makeSelections() {
        if (!canvasState.currentSelection) {
            return;
        }
        for (const line of canvasState.lines) {
            if (line.containedBy(canvasState.currentSelection)) {
                line.selected = true;
            }
        }
        for (const textBox of canvasState.textBoxes) {
            // TODO!
        }
        canvasState.currentSelection = null;
    }

    function clearSelections() {
        for (const line of canvasState.lines) {
            line.selected = false;
        }
        for (const textBox of canvasState.textBoxes) {
            // TODO!
        }
    }

    function handleMousedown(e: Konva.KonvaMouseEvent) {
        const event = e.detail;
        const pos = event.target.getStage().getPointerPosition();
        mouseIsDown = true;
        // Deactivate current text box if one is active
        if (canvasState.currentTextBox) {
            canvasState.textBoxes = [
                ...canvasState.textBoxes,
                canvasState.currentTextBox,
            ];
            history.add("draw", canvasState.currentTextBox);
            historyEmpty = false;
            canvasState.currentTextBox = null;
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
                pos.x,
                pos.y,
                0,
                0,
                lineColor,
            );
        } else if (activeTool === "selection") {
            clearSelections();
            canvasState.currentSelection = new SelectionData(
                pos.x,
                pos.y,
                0,
                0,
            );
        }
    }

    function handleMousemove(e: Konva.KonvaMouseEvent) {
        const event = e.detail;
        const pos = event.target.getStage().getPointerPosition();
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
            // Look for lines that intersect line AB
            canvasState.lines = canvasState.lines.filter((line) => {
                if (line.intersects([ax, ay, bx, by])) {
                    history.add("erase", line);
                    historyEmpty = false;
                    return false;
                }
                return true;
            });
        } else if (activeTool === "text") {
            if (!canvasState.currentTextBox) {
                return;
            }
            canvasState.currentTextBox.width =
                pos.x - canvasState.currentTextBox.x;
            canvasState.currentTextBox.height =
                pos.y - canvasState.currentTextBox.y;
        } else if (activeTool === "selection") {
            if (!canvasState.currentSelection) {
                return;
            }
            canvasState.currentSelection.width = pos.x - canvasState.currentSelection.x;
            canvasState.currentSelection.height = pos.y - canvasState.currentSelection.y;
        }
    }

    function handleMouseup(e: Konva.KonvaMouseEvent) {
        mouseIsDown = false;
        if (activeTool === "pencil" || activeTool === "line") {
            if (!canvasState.currentLine) {
                return;
            }
            canvasState.lines = [...canvasState.lines, canvasState.currentLine];
            history.add("draw", canvasState.currentLine);
            historyEmpty = false;
            canvasState.currentLine = null;
        } else if (activeTool === "eraser") {
            eraseStartPos = null;
        } else if (activeTool === "selection") {
            makeSelections();
        };
    }

    function undo() {
        const lastAction = history.actions.pop();
        if (lastAction) {
            if (lastAction.type === "draw") {
                canvasState.lines = canvasState.lines.filter(
                    (line) => line !== lastAction.element,
                );
            } else if (
                lastAction.type === "erase" &&
                lastAction.element instanceof LineData
            ) {
                canvasState.lines = [...canvasState.lines, lastAction.element];
            }
        }
        historyEmpty = history.actions.length === 0;
    }

    // Capture Ctrl+Z
    window.addEventListener("keydown", (event) => {
        if (event.ctrlKey && event.key === "z") {
            undo();
        }
    });

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
    });
</script>

<div class="flex flex-row gap-8 p-2 items-center border-b drop-shadow">
    <div class="flex flex-row gap-2 items-center">
        <label class="cursor-pointer">
            <input
                type="radio"
                class="peer hidden"
                bind:group={activeTool}
                value="pencil"
            />
            <BxPencil class="p-1 rounded-lg peer-checked:bg-gray-400 w-8 h-8" />
            <!-- This is just so the cursor is loaded -->
            <span class="hidden cursor-pencil"></span>
        </label>
        <label class="cursor-pointer">
            <input
                type="radio"
                class="peer hidden"
                bind:group={activeTool}
                value="eraser"
            />
            <BxEraser class="p-1 rounded-lg peer-checked:bg-gray-400 w-8 h-8" />
            <!-- This is just so the cursor is loaded -->
            <span class="hidden cursor-eraser"></span>
        </label>
        <label class="cursor-pointer">
            <input
                type="radio"
                class="peer hidden"
                bind:group={activeTool}
                value="line"
            />
            <div class="p-2 rounded-lg peer-checked:bg-gray-400 w-8 h-8">
                <svg viewBox="0 0 24 24">
                    <line
                        x1="0"
                        y1="24"
                        x2="24"
                        y2="0"
                        stroke="black"
                        stroke-width="3"
                    />
                </svg>
            </div>
            <!-- This is just so the cursor is loaded -->
            <span class="hidden cursor-line"></span>
        </label>
        <label class="cursor-pointer">
            <input
                type="radio"
                class="peer hidden"
                bind:group={activeTool}
                value="text"
            />
            <BxText class="p-1 rounded-lg peer-checked:bg-gray-400 w-8 h-8" />
            <!-- This is just so the cursor is loaded -->
            <span class="hidden cursor-text"></span>
        </label>
        <label class="cursor-pointer">
            <input
                type="radio"
                class="peer hidden"
                bind:group={activeTool}
                value="selection"
            />
            <BxSelection class="p-1 rounded-lg peer-checked:bg-gray-400 w-8 h-8" />
            <!-- This is just so the cursor is loaded -->
            <span class="hidden cursor-selection"></span>
        </label>
    </div>
    <label class="flex flex-row gap-2 items-center">
        <!-- <span>Color:</span> -->
        <input type="color" class="cursor-pointer" bind:value={lineColor} />
    </label>
    <div class="flex flex-row gap-2 items-center">
        <label class="cursor-pointer">
            <input
                type="radio"
                class="peer hidden"
                bind:group={lineWidth}
                value={2}
            />
            <div class="p-2 rounded-lg peer-checked:bg-gray-400 w-8 h-8">
                <svg viewBox="0 0 24 24">
                    <line
                        x1="0"
                        y1="24"
                        x2="24"
                        y2="0"
                        stroke="black"
                        stroke-width="2"
                    />
                </svg>
            </div>
        </label>
        <label class="cursor-pointer">
            <input
                type="radio"
                class="peer hidden"
                bind:group={lineWidth}
                value={3}
            />
            <div class="p-2 rounded-lg peer-checked:bg-gray-400 w-8 h-8">
                <svg viewBox="0 0 24 24">
                    <line
                        x1="0"
                        y1="24"
                        x2="24"
                        y2="0"
                        stroke="black"
                        stroke-width="4"
                    />
                </svg>
            </div>
        </label>
        <label class="cursor-pointer">
            <input
                type="radio"
                class="peer hidden"
                bind:group={lineWidth}
                value={4}
            />
            <div class="p-2 rounded-lg peer-checked:bg-gray-400 w-8 h-8">
                <svg viewBox="0 0 24 24">
                    <line
                        x1="0"
                        y1="24"
                        x2="24"
                        y2="0"
                        stroke="black"
                        stroke-width="6"
                    />
                </svg>
            </div>
        </label>
    </div>
    <button class={historyEmpty ? "text-gray-400" : ""} on:click={undo}
        ><BxUndo /></button
    >
</div>
<div class="flex flex-col h-screen bg-gray-100">
    <Konva.Stage
        class="overflow-scroll cursor-{activeTool}"
        config={{ width: boardSize.width, height: boardSize.height }}
        on:mousedown={handleMousedown}
        on:mousemove={handleMousemove}
        on:mouseup={handleMouseup}
    >
        <Konva.Layer>
            <Konva.Rect
                config={{
                    width: boardSize.width,
                    height: boardSize.height,
                    fill: canvasState.backgroundColor,
                }}
            ></Konva.Rect>
        </Konva.Layer>
        <Konva.Layer>
            {#each canvasState.lines as line}
                <Line {line} />
            {/each}
            {#if canvasState.currentLine}
                <Line line={canvasState.currentLine} />
            {/if}
            {#each canvasState.textBoxes as textBox}
                <TextBox {textBox} />
            {/each}
            {#if canvasState.currentTextBox}
                <TextBox textBox={canvasState.currentTextBox} active={true} />
            {/if}
            {#if canvasState.currentSelection}
                <Selection selection={canvasState.currentSelection} />
            {/if}
        </Konva.Layer>
    </Konva.Stage>
</div>
