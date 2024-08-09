<script lang="ts">
    import type { TextBoxData } from "$lib/canvasElements";
    import * as Konva from "svelte-konva";

    export let data: TextBoxData;
    export let active: boolean = false;

    const padding = 10;

    $: ({ x, y } = data.bounds.origin());
    $: ({ width, height } = data.bounds.dimensions());
</script>

<Konva.Text
    config={{
        x,
        y,
        text: data.text,
        fill: data.color,
        width,
        height,
        fontSize: 24,
    }}
/>
{#if active}
    <Konva.Rect
        config={{
            x: x - padding,
            y: y - padding,
            width: width + 2 * padding,
            height: height + 2 * padding,
            dash: [5, 5],
            stroke: "gray",
            strokeWidth: 1,
        }}
    />
{/if}