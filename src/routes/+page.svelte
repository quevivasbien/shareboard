<script lang="ts">
    import { onMount } from "svelte";
    import { Stage, Layer, Rect, Line, type KonvaMouseEvent } from "svelte-konva";

    let currentLine: number[] = [];
    let lines: number[][] = [];
    let painting: boolean = false;

    function handleMousedown(e: KonvaMouseEvent) {
        const event = e.detail;
        const pos = event.target.getStage().getPointerPosition();
        currentLine = [pos.x, pos.y];
        painting = true;
    }

    function handleMousemove(e: KonvaMouseEvent) {
        if (!painting) {
            return;
        }
        const event = e.detail;
        const pos = event.target.getStage().getPointerPosition();
        currentLine = [...currentLine, pos.x, pos.y];
    }

    function handleMouseup(e: KonvaMouseEvent) {
        const event = e.detail;
        const pos = event.target.getStage().getPointerPosition();
        currentLine = [...currentLine, pos.x, pos.y];
        painting = false;
        lines = [...lines, currentLine];
    }
</script>

<Stage class="cursor-crosshair" config={{ width: window.innerWidth, height: window.innerHeight }} on:mousedown={handleMousedown} on:mousemove={handleMousemove} on:mouseup={handleMouseup}>
    <Layer>
        {#each lines as line}
            <Line config={{
                    points: line,
                    stroke: "black",
                    strokeWidth: 5,
                    lineCap: "round",
                    lineJoin: "round"
                }}
            />
        {/each}
        {#if painting}
            <Line config={{
                    points: currentLine,
                    stroke: "black",
                    strokeWidth: 5,
                    lineCap: "round",
                    lineJoin: "round"
                }}
            />
        {/if}
    </Layer>
</Stage>
