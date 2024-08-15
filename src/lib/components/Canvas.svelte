<script lang="ts">
    import * as Konva from "svelte-konva";
    import { type Stage } from "konva/lib/Stage";

    import { textBoxInputStore, toolStateStore } from "$lib/stores";
    import { CanvasState } from "$lib/canvasState";
    import Line from "./Line.svelte";
    import TextBox from "./TextBox.svelte";
    import SelectedElements from "./SelectedElements.svelte";
    import Selection from "./Selection.svelte";

    // Bound values
    export let undo: () => void;
    export let historyEmpty: boolean;
    export let save: () => void;

    let stage: Stage;

    const BOARD_SIZE = {
        width: 1600,
        height: 1600,
    };

    let canvasState = new CanvasState();
    undo = () => { canvasState.undo() };
    $: historyEmpty = canvasState.history.empty;

    save = () => {
        // Save current canvas as an image
        const dataURL = stage.toDataURL();
        const a = document.createElement("a");
        a.href = dataURL;
        a.download = "shareboard.png";
        a.click();
        a.remove();
    }

    let cursorType: string;
    $: {
        if ($toolStateStore.activeTool === "line") {
            cursorType = "crosshair";
        } else if ($toolStateStore.activeTool === "selection") {
            cursorType = "auto";
        } else {
            cursorType = $toolStateStore.activeTool;
        }
    }

    function setSelectionMode(mouseOverSelection: string | null) {
        if (canvasState.mouseIsDown) {
            return;
        }
        if ($toolStateStore.activeTool !== "selection") {
            canvasState.selectionMode = null;
        } else if (!mouseOverSelection) {
            canvasState.selectionMode = "select";
            cursorType = "auto";
        } else if (mouseOverSelection === "center-center") {
            canvasState.selectionMode = "move";
            cursorType = "grab";
        } else {
            canvasState.selectionMode = `resize:${mouseOverSelection}`;
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

    $: setSelectionMode(canvasState.mouseOverSelection);

    function handleMousedown(e: Konva.KonvaMouseEvent) {
        canvasState.handleMousedown(e);
        canvasState = canvasState;
    }

    function handleMousemove(e: Konva.KonvaMouseEvent) {
        canvasState.handleMousemove(e);
        canvasState = canvasState;
    }

    function handleMouseup(e: Konva.KonvaMouseEvent) {
        canvasState.handleMouseup(e);
        canvasState = canvasState;
    }

    $: if ($textBoxInputStore) {
        $textBoxInputStore.style.display = canvasState.currentTextBox ? "block" : "none";
    }

    addEventListener("keydown", (e) => {
        canvasState.handleKeydown(e);
        canvasState = canvasState;
    });
</script>

<Konva.Stage
    bind:handle={stage}
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
                bind:mouseOverSelection={canvasState.mouseOverSelection}
                selectionMode={canvasState.selectionMode}
                mousePosition={canvasState.mousePosition}
                moveOrigin={canvasState.lastMousePos}
            />
        {/if}
    </Konva.Layer>
</Konva.Stage>
