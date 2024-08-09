<script lang="ts">
    import type { SelectionData } from "$lib/canvasElements";
    import * as Konva from "svelte-konva";

    export let selection: SelectionData;
</script>

<Konva.Rect
    config={{
        x: selection.x,
        y: selection.y,
        width: selection.width,
        height: selection.height,
        stroke: "rgb(102, 204, 255)",
        strokeWidth: 1,
        fill: "rgba(0, 51, 204, 0.1)",
    }}
/>
