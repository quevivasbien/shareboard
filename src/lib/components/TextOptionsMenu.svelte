<script lang="ts">
    import { BxFontFamily, BxFontSize } from "svelte-boxicons";
    import { slide } from "svelte/transition";
    export let fontSize: number;
    export let fontFace: string;

    let showFontSizeSelector = false;
    let showFontFaceSelector = false;

    $: if (!fontSize || fontSize < 10) {
        fontSize = 10;
    } else if (fontSize > 72) {
        fontSize = 72;
    }
</script>

<div
    class="flex flex-row gap-2 px-2 items-center gap-2 divide-x divide-solid"
    transition:slide={{ axis: "x" }}
>
    <div class="flex flex-row items-center gap-2">
        <button
            class="cursor-pointer"
            on:click={() => {
                showFontSizeSelector = !showFontSizeSelector;
                showFontFaceSelector = false;
            }}
        >
            <BxFontSize
                class="p-1 rounded-lg peer-checked:bg-gray-400 w-8 h-8"
            />
        </button>
        {#if showFontSizeSelector}
            <label class="flex flex-row items-center gap-2">
                <input
                    type="range"
                    min="10"
                    max="72"
                    step="2"
                    bind:value={fontSize}
                    transition:slide={{ axis: "x" }}
                />
            </label>
        {/if}
        <input class="max-w-12 px-1" type="number" min="10" max="72" step="2" bind:value={fontSize} />
    </div>
    <div class="flex flex-row items-center gap-2">
        <button
            class="cursor-pointer"
            on:click={() => {
                showFontFaceSelector = !showFontFaceSelector;
                showFontSizeSelector = false;
            }}
        >
            <BxFontFamily
                class="p-1 rounded-lg peer-checked:bg-gray-400 w-8 h-8"
            />
        </button>
        {#if showFontFaceSelector}
            <label>
                <input type="radio" bind:group={fontFace} value="sans-serif" />
                <span class="font-sans">Sans</span>
            </label>
            <label>
                <input type="radio" bind:group={fontFace} value="serif" />
                <span class="font-serif">Serif</span>
            </label>
            <label>
                <input type="radio" bind:group={fontFace} value="monospace" />
                <span class="font-mono">Mono</span>
            </label>
        {/if}
    </div>
</div>
