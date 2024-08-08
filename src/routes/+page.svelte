<script lang="ts">
    import { BxEraser, BxPencil, BxUndo } from "svelte-boxicons";
    import { Stage, Layer, Line, Rect, type KonvaMouseEvent } from "svelte-konva";

    import { CanvasHistory, type CanvasAction, type FreeformLine } from "$lib/canvasElements";

    const canvasState = {
        lines: [] as FreeformLine[],
        currentLine: null as FreeformLine | null,
        backgroundColor: "white",
    };

    let history = new CanvasHistory();
    let historyEmpty = true;

    let activeTool = "pencil";
    let mousePressed = false;

    let lineColor: string = "black";
    let lineWidth: number = 5;

    const boardSize = {
        width: 1600,
        height: 1600,
    };

    function handleMousedown(e: KonvaMouseEvent) {
        const event = e.detail;
        const pos = event.target.getStage().getPointerPosition();
        mousePressed = true;
        if (activeTool === "pencil") {
            canvasState.currentLine = {
                points: [pos.x, pos.y],
                color: lineColor,
                width: lineWidth,
            };
        }
    }

    function handleMousemove(e: KonvaMouseEvent) {
        if (!mousePressed) {
            return;
        }
        const event = e.detail;
        const pos = event.target.getStage().getPointerPosition();
        if (activeTool === "pencil") {
            if (!canvasState.currentLine) {
                return;
            }
            canvasState.currentLine.points = [...canvasState.currentLine.points, pos.x, pos.y];
        }
        else if (activeTool === "eraser") {
            // Look for lines near the mouse position
            canvasState.lines = canvasState.lines.filter((line) => {
                for (let j = 0; j < line.points.length; j += 2) {
                    const x = line.points[j];
                    const y = line.points[j + 1];
                    const dist = Math.sqrt(Math.pow(pos.x - x, 2) + Math.pow(pos.y - y, 2));
                    if (dist < 10) {
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
        if (!mousePressed) {
            return;
        }
        const event = e.detail;
        const pos = event.target.getStage().getPointerPosition();
        mousePressed = false;
        if (activeTool === "pencil") {
            if (!canvasState.currentLine) {
                return;
            }
            canvasState.currentLine.points = [...canvasState.currentLine.points, pos.x, pos.y];
            canvasState.lines = [...canvasState.lines, canvasState.currentLine];
            history.add("draw", canvasState.currentLine);
            historyEmpty = false;
            canvasState.currentLine = null;
        }
    }

    function undo() {
        const lastAction = history.actions.pop();
        if (lastAction) {
            if (lastAction.type === "draw") {
                canvasState.lines = canvasState.lines.slice(0, -1);
            }
            else if (lastAction.type === "erase") {
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
        <input id="pencil" type="radio" bind:group={activeTool} value="pencil" />
        <label for="pencil"><BxPencil /></label>
        <div class="hidden cursor-pencil"></div>  <!-- This is just so the cursor is loaded -->
        <input id="eraser" type="radio" bind:group={activeTool} value="eraser" />
        <label for="eraser"><BxEraser /></label>
        <div class="hidden cursor-eraser"></div>  <!-- This is just so the cursor is loaded -->
    </div>
    <div class="flex flex-row gap-2 items-center">
        <label for="color">Color:</label>
        <input id="color" type="color" bind:value={lineColor} />
    </div>
    <div class="flex flex-row gap-2 items-center">
        <label for="width">Width:</label>
        <input id="width" type="number" bind:value={lineWidth} />
    </div>
    <button class={historyEmpty ? "text-gray-400" : ""} on:click={undo}><BxUndo /></button>
</div>
<div class="flex flex-col h-screen bg-gray-100">
    <Stage class="overflow-scroll cursor-{activeTool}" config={{ width: boardSize.width, height: boardSize.height }} on:mousedown={handleMousedown} on:mousemove={handleMousemove} on:mouseup={handleMouseup}>
        <Layer>
            <Rect config={{ width: boardSize.width, height: boardSize.height, fill: canvasState.backgroundColor }}></Rect>
        </Layer>
        <Layer>
            {#each canvasState.lines as line}
                <Line config={{
                        points: line.points,
                        stroke: line.color,
                        strokeWidth: line.width,
                        lineCap: "round",
                        lineJoin: "round"
                    }}
                />
            {/each}
            {#if canvasState.currentLine}
                <Line config={{
                        points: canvasState.currentLine.points,
                        stroke: canvasState.currentLine.color,
                        strokeWidth: canvasState.currentLine.width,
                        lineCap: "round",
                        lineJoin: "round"
                    }}
                />
            {/if}
        </Layer>
    </Stage>
</div>
