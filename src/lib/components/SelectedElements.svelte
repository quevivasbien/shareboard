<script lang="ts">
    import type { CanvasElementData } from "$lib/canvasElements";
    import { BoundingBox, getBoundsAfterResize } from "$lib/geometry";
    import * as Konva from "svelte-konva";

    export let elements: CanvasElementData[];
    export let mouseOverSelection: string | null;
    export let selectionMode: string | null;
    export let moveOrigin: { x: number; y: number } | null;
    export let mousePosition: { x: number; y: number };

    const PADDING = 10;
    const SELECT_TOL = 10;

    $: bounds = BoundingBox.union(elements.map((e) => e.boundingBox()));

    let x: number, y: number, width: number, height: number;
    $: {
        const origin = bounds.origin();
        x = origin.x - PADDING;
        y = origin.y - PADDING;
        const dims = bounds.dimensions();
        width = dims.width + 2 * PADDING;
        height = dims.height + 2 * PADDING;
    }

    function setMouseOverSelection(e: Konva.KonvaMouseEvent) {
        const event = e.detail;
        const pos = event.target.getStage()?.getPointerPosition();
        if (!pos) {
            return;
        }
        let horizontal;
        if (Math.abs(pos.x - x) < SELECT_TOL) {
            horizontal = "left";
        } else if (Math.abs(pos.x - x - width) < SELECT_TOL) {
            horizontal = "right";
        } else {
            horizontal = "center";
        }
        let vertical;
        if (Math.abs(pos.y - y) < SELECT_TOL) {
            vertical = "top";
        } else if (Math.abs(pos.y - y - height) < SELECT_TOL) {
            vertical = "bottom";
        } else {
            vertical = "center";
        }
        mouseOverSelection = `${horizontal}-${vertical}`;
    }

    let previewBounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    } | null;
    $: {
        if (!selectionMode || !moveOrigin) {
            previewBounds = null;
        } else if (selectionMode === "move") {
            previewBounds = {
                x: x + mousePosition.x - moveOrigin.x,
                y: y + mousePosition.y - moveOrigin.y,
                width,
                height,
            };
        } else if (selectionMode.startsWith("resize")) {
            const [horizSource, vertSource] = selectionMode.split(":")[1].split("-");
            const bbox = getBoundsAfterResize(
                bounds,
                mousePosition,
                horizSource,
                vertSource,
            );
            const bboxOrigin = bbox.origin();
            const bboxDims = bbox.dimensions();
            previewBounds = {
                x: bboxOrigin.x - PADDING,
                y: bboxOrigin.y - PADDING,
                width: bboxDims.width + 2 * PADDING,
                height: bboxDims.height + 2 * PADDING,
            };
        }
    }
</script>

<Konva.Group>
    {#each elements as element}
        <svelte:component this={element.componentType()} data={element} />
    {/each}

    <Konva.Rect
        config={{
            x,
            y,
            width,
            height,
            stroke: "rgb(102, 204, 255)",
            strokeWidth: 1,
            fill: "rgba(0, 51, 204, 0.1)",
        }}
        on:mousemove={(e) => setMouseOverSelection(e)}
        on:mouseleave={() => (mouseOverSelection = null)}
    />

    {#if previewBounds}
        <Konva.Rect
            config={{
                ...previewBounds,
                stroke: "rgb(102, 204, 255)",
                strokeWidth: 1,
                dash: [5, 5],
            }}
        />
    {/if}
</Konva.Group>
