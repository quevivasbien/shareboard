<script lang="ts">
    import type { CanvasElementData } from "$lib/canvasElements";
    import { BoundingBox } from "$lib/geometry";
    import * as Konva from "svelte-konva";

    export let elements: CanvasElementData[];
    export let mouseOverSelection: boolean;
    export let moveOrigin: { x: number; y: number } | null;
    export let mousePosition: { x: number; y: number };

    const padding = 10;

    $: bounds = BoundingBox.union(elements.map((e) => e.boundingBox()));
    $: ({ x, y } = bounds.origin());
    $: ({ width, height } = bounds.dimensions());
</script>

<Konva.Group>
    {#each elements as element}
        <svelte:component this={element.componentType()} data={element} />
    {/each}

    <Konva.Rect
        config={{
            x: x - padding,
            y: y - padding,
            width: width + 2 * padding,
            height: height + 2 * padding,
            stroke: "rgb(102, 204, 255)",
            strokeWidth: 1,
            fill: "rgba(0, 51, 204, 0.1)",
        }}
        on:mouseenter={() => mouseOverSelection = true}
        on:mouseleave={() => mouseOverSelection = false}
    />

    {#if moveOrigin}
        <Konva.Rect
            config={{
                x: x + mousePosition.x - moveOrigin.x - padding,
                y: y + mousePosition.y - moveOrigin.y - padding,
                width: width + 2 * padding,
                height: height + 2 * padding,
                stroke: "rgb(102, 204, 255)",
                strokeWidth: 1,
                dash: [5, 5],
            }}
        />
    {/if}
</Konva.Group>