<script lang="ts">
    import * as Konva from "svelte-konva";

    import type { CanvasState } from "$lib/canvasElements";
    import Line from "./Line.svelte";
    import TextBox from "./TextBox.svelte";
    import SelectedElements from "./SelectedElements.svelte";
    import Selection from "./Selection.svelte";

    export let canvasState: CanvasState;
    export let cursorType: string;

    export let handleMousedown: (e: Konva.KonvaMouseEvent) => void;
    export let handleMousemove: (e: Konva.KonvaMouseEvent) => void;
    export let handleMouseup: (e: Konva.KonvaMouseEvent) => void;

    export let mouseOverSelection: boolean;
    export let selectionMoveOrigin: { x: number; y: number } | null;

    const BOARD_SIZE = {
        width: 1600,
        height: 1600,
    };
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
                moveOrigin={selectionMoveOrigin}
                mousePosition={canvasState.cursorPosition}
            />
        {/if}
    </Konva.Layer>
</Konva.Stage>
