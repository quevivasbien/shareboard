<script lang="ts">
    import { BxEraser, BxPencil, BxUndo } from "svelte-boxicons";
    import {
        Stage,
        Layer,
        Line,
        Rect,
        type KonvaMouseEvent,
    } from "svelte-konva";

    import { CanvasHistory, type FreeformLine } from "$lib/canvasElements";
    import { linesIntersect } from "$lib/geometry";

    const canvasState = {
        cursorPosition: { x: 0, y: 0 },
        lines: [] as FreeformLine[],
        currentLine: null as FreeformLine | null,
        backgroundColor: "white",
    };

    let eraseStartPos: { x: number; y: number } | null = null;

    let history = new CanvasHistory();
    let historyEmpty = true;

    let activeTool = "pencil";

    let lineColor: string = "black";
    let lineWidth: number = 3;

    const boardSize = {
        width: 1600,
        height: 1600,
    };

    function handleMousedown(e: KonvaMouseEvent) {
        const event = e.detail;
        const pos = event.target.getStage().getPointerPosition();
        if (activeTool === "pencil") {
            canvasState.currentLine = {
                points: [pos.x, pos.y],
                color: lineColor,
                width: lineWidth,
            };
        } else if (activeTool === "line") {
            canvasState.currentLine = {
                points: [pos.x, pos.y, pos.x, pos.y],
                color: lineColor,
                width: lineWidth,
            };
        } else if (activeTool === "eraser") {
            eraseStartPos = pos;
        }
    }

    function handleMousemove(e: KonvaMouseEvent) {
        const event = e.detail;
        const pos = event.target.getStage().getPointerPosition();
        canvasState.cursorPosition = pos;
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
                for (let j = 0; j < line.points.length - 2; j += 2) {
                    const cx = line.points[j];
                    const cy = line.points[j + 1];
                    const dx = line.points[j + 2];
                    const dy = line.points[j + 3];
                    if (linesIntersect(ax, ay, bx, by, cx, cy, dx, dy)) {
                        history.add("erase", line);
                        historyEmpty = false;
                        return false;
                    }
                }
                return true;
            });
        }
    }

    function handleMouseup(e: KonvaMouseEvent) {
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
        }
    }

    function undo() {
        const lastAction = history.actions.pop();
        if (lastAction) {
            if (lastAction.type === "draw") {
                canvasState.lines = canvasState.lines.filter(
                    (line) => line !== lastAction.object,
                );
            } else if (lastAction.type === "erase") {
                canvasState.lines = [...canvasState.lines, lastAction.object];
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
    <Stage
        class="overflow-scroll cursor-{activeTool}"
        config={{ width: boardSize.width, height: boardSize.height }}
        on:mousedown={handleMousedown}
        on:mousemove={handleMousemove}
        on:mouseup={handleMouseup}
    >
        <Layer>
            <Rect
                config={{
                    width: boardSize.width,
                    height: boardSize.height,
                    fill: canvasState.backgroundColor,
                }}
            ></Rect>
        </Layer>
        <Layer>
            {#each canvasState.lines as line}
                <Line
                    config={{
                        points: line.points,
                        stroke: line.color,
                        strokeWidth: line.width,
                        lineCap: "round",
                        lineJoin: "round",
                    }}
                />
            {/each}
            {#if canvasState.currentLine}
                <Line
                    config={{
                        points: canvasState.currentLine.points,
                        stroke: canvasState.currentLine.color,
                        strokeWidth: canvasState.currentLine.width,
                        lineCap: "round",
                        lineJoin: "round",
                    }}
                />
            {/if}
        </Layer>
    </Stage>
</div>
