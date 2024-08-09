<script lang="ts">
    import type { LineData } from "$lib/canvasElements";
    import * as Konva from "svelte-konva";
    import Selection from "./Selection.svelte";

    export let line: LineData;
</script>

<Konva.Group config={{ draggable: true, }}>
    <Konva.Line
        config={{
            points: line.points,
            stroke: line.color,
            strokeWidth: line.width,
            lineCap: "round",
            lineJoin: "round",
        }}
    />

    {#if line.selected}
        <Selection selection={line.boundingBox()} />
    {/if}
</Konva.Group>