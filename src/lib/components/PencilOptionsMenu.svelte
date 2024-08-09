<script lang="ts">
    export let lineWidth: number;
</script>

<div class="flex flex-row gap-2 items-center">
    <label class="cursor-pointer">
        <input
            type="radio"
            class="peer hidden"
            bind:group={lineWidth}
            value={2}
        />
        <div class="p-2 rounded-lg peer-checked:bg-gray-400 w-8 h-8">
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
        <div class="p-2 rounded-lg peer-checked:bg-gray-400 w-8 h-8">
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
        <div class="p-2 rounded-lg peer-checked:bg-gray-400 w-8 h-8">
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
