<script lang="ts">
    import { slide } from "svelte/transition";

    export let lineWidth: number;
    export let lineStyle: "dash" | "solid";
</script>

<div class="flex flex-row items-center divide-x divide-solid"  transition:slide={{axis: 'x'}}>
    <div class="flex flex-row gap-1 sm:gap-2 px-2 items-center">
        <label class="cursor-pointer">
            <input
                type="radio"
                class="peer hidden"
                bind:group={lineWidth}
                value={2}
            />
            <div class="p-2 rounded-lg peer-checked:bg-gray-400 w-6 h-6 sm:w-8 sm:h-8">
                <svg viewBox="0 0 24 24">
                    <line
                        x1="0"
                        y1="24"
                        x2="24"
                        y2="0"
                        stroke="black"
                        stroke-width="2"
                    />
                </svg>
            </div>
        </label>
        <label class="cursor-pointer">
            <input
                type="radio"
                class="peer hidden"
                bind:group={lineWidth}
                value={3}
            />
            <div class="p-2 rounded-lg peer-checked:bg-gray-400 w-6 h-6 sm:w-8 sm:h-8">
                <svg viewBox="0 0 24 24">
                    <line
                        x1="0"
                        y1="24"
                        x2="24"
                        y2="0"
                        stroke="black"
                        stroke-width="4"
                    />
                </svg>
            </div>
        </label>
        <label class="cursor-pointer">
            <input
                type="radio"
                class="peer hidden"
                bind:group={lineWidth}
                value={4}
            />
            <div class="p-2 rounded-lg peer-checked:bg-gray-400 w-6 h-6 sm:w-8 sm:h-8">
                <svg viewBox="0 0 24 24">
                    <line
                        x1="0"
                        y1="24"
                        x2="24"
                        y2="0"
                        stroke="black"
                        stroke-width="6"
                    />
                </svg>
            </div>
        </label>
    </div>
    <div class="flex flex-row gap-1 sm:gap-2 px-2 items-center">
        <label class="cursor-pointer">
            <input
                type="radio"
                class="peer hidden"
                bind:group={lineStyle}
                value="solid"
            />
            <div class="p-2 rounded-lg peer-checked:bg-gray-400 w-6 h-6 sm:w-8 sm:h-8">
                <svg viewBox="0 0 24 24">
                    <line
                        x1="0"
                        y1="24"
                        x2="24"
                        y2="0"
                        stroke="black"
                        stroke-width="8"
                    />
                </svg>
            </div>
        </label>
        <label class="cursor-pointer">
            <input
                type="radio"
                class="peer hidden"
                bind:group={lineStyle}
                value="dash"
            />
            <div class="p-2 rounded-lg peer-checked:bg-gray-400 w-6 h-6 sm:w-8 sm:h-8">
                <svg viewBox="0 0 24 24">
                    <line
                        x1="0"
                        y1="24"
                        x2="6"
                        y2="18"
                        stroke="black"
                        stroke-width="8"
                    />
                    <line
                        x1="8"
                        y1="16"
                        x2="14"
                        y2="10"
                        stroke="black"
                        stroke-width="8"
                    />
                    <line
                        x1="16"
                        y1="8"
                        x2="24"
                        y2="0"
                        stroke="black"
                        stroke-width="8"
                    />
                </svg>
            </div>
        </label>
    </div>
</div>
