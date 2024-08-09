<script lang="ts">
    import type { SelectionData } from "$lib/canvasElements";
    import * as Konva from "svelte-konva";

    export let data: SelectionData;

    $: ({ x, y } = data.bounds.origin());
    $: ({ width, height } = data.bounds.dimensions());
</script>

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
/>
