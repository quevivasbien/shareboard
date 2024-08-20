<script lang="ts">
    import { BxCollapse, BxSave, BxUndo, BxVideo } from "svelte-boxicons";
    import { onMount } from "svelte";

    import ToolSelectMenu from "$lib/components/ToolSelectMenu.svelte";
    import PencilOptionsMenu from "$lib/components/PencilOptionsMenu.svelte";
    import Canvas from "$lib/components/Canvas.svelte";
    import { textBoxInputStore, userStore, type ToolState } from "$lib/stores";
    import TextOptionsMenu from "$lib/components/TextOptionsMenu.svelte";
    import VideoBox from "$lib/components/VideoBox.svelte";
    import { fade } from "svelte/transition";
    import { logout } from "$lib/firebase";
    import { getRTCPeerConnection } from "$lib/webrtc";

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

    let showVideo = false;

    let peerConnection: RTCPeerConnection;
    onMount(() => {
        peerConnection = getRTCPeerConnection();
    });
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
        <button on:click={save}><BxSave /></button>
        <button
            class={historyEmpty ? "text-gray-400 cursor-default" : ""}
            on:click={undo}><BxUndo /></button
        >
    </div>
    <div class="flex flex-row gap-8 p-2 items-center justify-end">
        {#if $userStore}
            <div class="text-gray-500">Logged in as {$userStore.email}</div>
            <button class="text-blue-500 hover:underline" on:click={logout}>Logout</button>
        {:else}
            <a href="./auth/login" class="text-blue-500 hover:underline">Login</a>
        {/if}
        <button class="disabled:opacity-50" on:click={() => (showVideo = !showVideo)} disabled={!$userStore}>
            {#if showVideo}
                <BxCollapse />
            {:else}
                <BxVideo />
            {/if}
        </button>
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

    {#if showVideo}
        <div class="absolute top-0 right-0" transition:fade={{ duration: 100 }}>
            <VideoBox bind:pc={peerConnection} />
        </div>
    {/if}
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
