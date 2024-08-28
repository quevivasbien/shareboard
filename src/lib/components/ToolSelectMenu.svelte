<script lang="ts">
    import { BxEraser, BxPencil, BxSelection, BxText } from "svelte-boxicons";

    export let activeTool: string;
</script>

<div class="flex flex-row gap-1 sm:gap-2 items-center">
    <label class="cursor-pointer">
        <input
            type="radio"
            class="peer hidden"
            bind:group={activeTool}
            value="pencil"
        />
        <BxPencil class="p-1 rounded-lg peer-checked:bg-gray-400 w-6 h-6 sm:w-8 sm:h-8" />
    </label>
    <label class="cursor-pointer">
        <input
            type="radio"
            class="peer hidden"
            bind:group={activeTool}
            value="eraser"
        />
        <BxEraser class="p-1 rounded-lg peer-checked:bg-gray-400 w-6 h-6 sm:w-8 sm:h-8" />
    </label>
    <label class="cursor-pointer">
        <input
            type="radio"
            class="peer hidden"
            bind:group={activeTool}
            value="line"
        />
        <div class="p-2 rounded-lg peer-checked:bg-gray-400 w-6 h-6 sm:w-8 sm:h-8">
            <svg viewBox="0 0 24 24">
                <line
                    x1="0"
                    y1="24"
                    x2="24"
                    y2="0"
                    stroke="black"
                    stroke-width="3"
                />
            </svg>
        </div>
    </label>
    <label class="cursor-pointer">
        <input
            type="radio"
            class="peer hidden"
            bind:group={activeTool}
            value="text"
        />
        <BxText class="p-1 rounded-lg peer-checked:bg-gray-400 w-6 h-6 sm:w-8 sm:h-8" />
    </label>
    <label class="cursor-pointer">
        <input
            type="radio"
            class="peer hidden"
            bind:group={activeTool}
            value="selection"
        />
        <BxSelection class="p-1 rounded-lg peer-checked:bg-gray-400 w-6 h-6 sm:w-8 sm:h-8" />
    </label>
</div>
