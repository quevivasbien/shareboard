<script lang="ts">
    import { BxUndo } from "svelte-boxicons";

    import ToolSelectMenu from "$lib/components/ToolSelectMenu.svelte";
    import PencilOptionsMenu from "$lib/components/PencilOptionsMenu.svelte";
    import Canvas from "$lib/components/Canvas.svelte";

    let toolState = {
        activeTool: "pencil",
        color: "black",
        size: 3,
    };

    let undo: () => void;
    let historyEmpty: boolean;
</script>

<div class="flex flex-row gap-8 p-2 items-center border-b drop-shadow">
    <ToolSelectMenu bind:activeTool={toolState.activeTool} />
    <label class="flex flex-row gap-2 items-center">
        <!-- <span>Color:</span> -->
        <input type="color" class="cursor-pointer" bind:value={toolState.color} />
    </label>
    <PencilOptionsMenu bind:lineWidth={toolState.size} />
    <button class={historyEmpty ? "text-gray-400" : ""} on:click={undo}
        ><BxUndo /></button
    >
</div>
<div class="flex flex-col h-screen bg-gray-100">
    <div class="overflow-scroll relative">
        <Canvas
            {toolState}
            bind:undo
            bind:historyEmpty
        />
    </div>
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