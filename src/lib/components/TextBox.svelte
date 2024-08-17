<script lang="ts">
    import * as Konva from "svelte-konva";
    
    import type { TextBoxData } from "$lib/canvasElements";
    import { textBoxInputStore, type ToolState } from "$lib/stores";

    export let data: TextBoxData;
    export let active: boolean = false;

    const PADDING = 10;

    $: ({ x, y } = data.bounds.origin());
    $: ({ width, height } = data.bounds.dimensions());


    function updateInputLocation(x: number, y: number) {
        if (!active || !$textBoxInputStore) {
            return;
        }
        // const yOffset = isFirefox ? -(2 * Math.round(fontSize / 20)) : 0;
        $textBoxInputStore.style.top = `${y}px`;
        $textBoxInputStore.style.left = `${x}px`;
    }

    function updateInputDimensions(width: number, height: number) {
        if (!active || !$textBoxInputStore) {
            return;
        }
        $textBoxInputStore.style.width = `${width}px`;
        $textBoxInputStore.style.height = `${height}px`;
    }

    $: updateInputLocation(x, y);
    $: updateInputDimensions(width, height);
</script>

{#if active || data.mouseIsOver}
    <Konva.Rect
        config={{
            x: x - PADDING,
            y: y - PADDING,
            width: width + 2 * PADDING,
            height: height + 2 * PADDING,
            dash: [5, 5],
            stroke: "gray",
            strokeWidth: 1,
        }}
    />
{/if}

{#if !active}
    <Konva.Text
        config={{
            x,
            y,
            text: data.text,
            fill: data.color,
            width,
            height,
            fontSize: data.fontSize,   
            color: data.color,
            fontFamily: data.fontFace,
            lineHeight: 1,
        }}
    />
{/if}
