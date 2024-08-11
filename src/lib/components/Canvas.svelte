<script lang="ts">
    import * as Konva from "svelte-konva";

    import type { CanvasState } from "$lib/canvasElements";
    import Line from "./Line.svelte";
    import TextBox from "./TextBox.svelte";
    import SelectedElements from "./SelectedElements.svelte";
    import Selection from "./Selection.svelte";

    export let canvasState: CanvasState;
    export let activeTool: string;
    export let selectionMode: string | null;

    export let handleMousedown: (e: Konva.KonvaMouseEvent) => void;
    export let handleMousemove: (e: Konva.KonvaMouseEvent) => void;
    export let handleMouseup: (e: Konva.KonvaMouseEvent) => void;

    export let mouseIsDown: boolean;
    export let mouseOverSelection: string | null;
    export let selectionMoveOrigin: { x: number; y: number } | null;

    const BOARD_SIZE = {
        width: 1600,
        height: 1600,
    };

    let cursorType: string;
    $: {
        if (activeTool === "line") {
            cursorType = "crosshair";
        } else if (activeTool === "selection") {
            cursorType = "auto";
        } else {
            cursorType = activeTool;
        }
    }

    function setSelectionMode(mouseOverSelection: string | null) {
        if (mouseIsDown) {
            return;
        }
        if (activeTool !== "selection") {
            selectionMode = null;
        } else if (!mouseOverSelection) {
            selectionMode = "select";
            cursorType = "auto";
        } else if (mouseOverSelection === "center-center") {
            selectionMode = "move";
            cursorType = "grab";
        } else {
            selectionMode = `resize:${mouseOverSelection}`;
            if (
                mouseOverSelection === "left-top" ||
                mouseOverSelection === "right-bottom"
            ) {
                cursorType = "nwse-resize";
            } else if (
                mouseOverSelection === "left-bottom" ||
                mouseOverSelection === "right-top"
            ) {
                cursorType = "nesw-resize";
            } else if (
                mouseOverSelection === "left-center" ||
                mouseOverSelection === "right-center"
            ) {
                cursorType = "ew-resize";
            } else if (
                mouseOverSelection === "center-top" ||
                mouseOverSelection === "center-bottom"
            ) {
                cursorType = "ns-resize";
            }
        }
    }

    $: setSelectionMode(mouseOverSelection);
</script>

<Konva.Stage
    class="cursor-{cursorType}"
    config={{ width: BOARD_SIZE.width, height: BOARD_SIZE.height }}
    on:mousedown={handleMousedown}
    on:mousemove={handleMousemove}
    on:mouseup={handleMouseup}
>
    <Konva.Layer>
        <Konva.Rect
            config={{
                width: BOARD_SIZE.width,
                height: BOARD_SIZE.height,
                fill: canvasState.backgroundColor,
            }}
        ></Konva.Rect>
    </Konva.Layer>
    <Konva.Layer>
        {#each canvasState.elements as element}
            <svelte:component this={element.componentType()} data={element} />
        {/each}
        {#if canvasState.currentLine}
            <Line data={canvasState.currentLine} />
        {/if}
        {#if canvasState.currentTextBox}
            <TextBox data={canvasState.currentTextBox} active={true} />
        {/if}
        {#if canvasState.currentSelection}
            <Selection data={canvasState.currentSelection} />
        {/if}
        {#if canvasState.selectedElements.length !== 0}
            <SelectedElements
                elements={canvasState.selectedElements}
                bind:mouseOverSelection
                {selectionMode}
                moveOrigin={selectionMoveOrigin}
                mousePosition={canvasState.cursorPosition}
            />
        {/if}
    </Konva.Layer>
</Konva.Stage>
