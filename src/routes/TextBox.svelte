<script lang="ts">
    import type { TextBoxData } from "$lib/canvasElements";
    import * as Konva from "svelte-konva";

    export let textBox: TextBoxData;
    export let active: boolean = false;

    const padding = 10;
</script>

<Konva.Text
    config={{
        x: textBox.x,
        y: textBox.y,
        text: textBox.text,
        fill: textBox.color,
        width: textBox.width,
        height: textBox.height,
        fontSize: 24,
    }}
/>
{#if active}
    <Konva.Rect
        config={{
            x: textBox.x - padding,
            y: textBox.y - padding,
            width: textBox.width + 2 * padding,
            height: textBox.height + 2 * padding,
            dash: [5, 5],
            stroke: "gray",
            strokeWidth: 1,
        }}
    />
{/if}