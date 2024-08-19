<script lang="ts">
    import { BxSave, BxUndo } from "svelte-boxicons";

    import ToolSelectMenu from "$lib/components/ToolSelectMenu.svelte";
    import PencilOptionsMenu from "$lib/components/PencilOptionsMenu.svelte";
    import Canvas from "$lib/components/Canvas.svelte";
    import { textBoxInputStore, type ToolState } from "$lib/stores";
    import TextOptionsMenu from "$lib/components/TextOptionsMenu.svelte";

    let undo: () => void;
    let historyEmpty: boolean;

    let save: () => void;

    let toolState: ToolState = {
        activeTool: "pencil",
        color: "#000000",
        size: 3,
        style: "solid",
        fontSize: 16,
        fontFace: "sans-serif",
    };
</script>

<div
    class="flex flex-row flex-wrap justify-between w-full items-center px-2 border-b bg-white"
>
    <div class="flex flex-row gap-8 p-2 items-center">
        <ToolSelectMenu bind:activeTool={toolState.activeTool} />
        <label class="flex flex-row gap-2 items-center">
            <input
                type="color"
                class="cursor-pointer"
                bind:value={toolState.color}
            />
        </label>
        {#if toolState.activeTool === "pencil" || toolState.activeTool === "line"}
            <PencilOptionsMenu
                bind:lineWidth={toolState.size}
                bind:lineStyle={toolState.style}
            />
        {:else if toolState.activeTool === "text"}
            <TextOptionsMenu
                bind:fontSize={toolState.fontSize}
                bind:fontFace={toolState.fontFace}
            />
        {/if}
        <button class={historyEmpty ? "text-gray-400" : ""} on:click={undo}
            ><BxUndo /></button
        >
    </div>
    <div class="flex flex-row gap-8 p-2 items-center justify-end">
        <button on:click={save}><BxSave /></button>
    </div>
</div>

<div class="relative">
    <div class="absolute top-0 left-0 flex flex-col h-screen bg-gray-100">
        <div class="overflow-scroll">
            <Canvas bind:undo bind:historyEmpty bind:save bind:toolState />
        </div>
    </div>
    <textarea
        class="absolute outline-none resize-none bg-transparent"
        style="line-height: 1"
        bind:this={$textBoxInputStore}
    ></textarea>
</div>

<!-- Just so other cursor types can be used -->
<div class="hidden cursor-pencil"></div>
<div class="hidden cursor-eraser"></div>
<div class="hidden cursor-crosshair"></div>
<div class="hidden cursor-text"></div>
<div class="hidden cursor-selection"></div>
<div class="hidden cursor-grab"></div>
<div class="hidden cursor-nwse-resize"></div>
<div class="hidden cursor-nesw-resize"></div>
<div class="hidden cursor-ew-resize"></div>
<div class="hidden cursor-ns-resize"></div>
