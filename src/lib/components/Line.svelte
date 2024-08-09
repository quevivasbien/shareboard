<script lang="ts">
    import type { LineData } from "$lib/canvasElements";
    import * as Konva from "svelte-konva";

    export let data: LineData;
</script>

<Konva.Line
    config={{
        points: data.points,
        stroke: data.color,
        strokeWidth: data.width,
        lineCap: "round",
        lineJoin: "round",
    }}
/>