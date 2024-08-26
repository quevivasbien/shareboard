<script lang="ts">
    import { BxCollapse, BxDownload, BxSave, BxUndo, BxVideo } from "svelte-boxicons";

    import ToolSelectMenu from "$lib/components/ToolSelectMenu.svelte";
    import PencilOptionsMenu from "$lib/components/PencilOptionsMenu.svelte";
    import Canvas from "$lib/components/Canvas.svelte";
    import { connectionStateStore, textBoxInputStore, userStore, type ToolState } from "$lib/stores";
    import TextOptionsMenu from "$lib/components/TextOptionsMenu.svelte";
    import VideoBox from "$lib/components/VideoBox.svelte";
    import { fade, slide } from "svelte/transition";
    import { logout } from "$lib/firebase";
    import { getRTCPeerConnection } from "$lib/webrtc";

    let undo: () => void;
    let historyEmpty: boolean;

    let download: () => void;
    let save: () => Promise<void>;
    let lastSave: string | null = null;
    let load: () => Promise<void>;
    let offeringLoad = false;

    let toolState: ToolState = {
        activeTool: "pencil",
        color: "#000000",
        size: 3,
        style: "solid",
        fontSize: 16,
        fontFace: "sans-serif",
    };

    // TODO: When reloading, if video was on, keep it on
    let showVideo = false;
    $: if (!$userStore?.email) {
        showVideo = false;
    }

    let peerConnection: RTCPeerConnection = getRTCPeerConnection();
    let remoteStream = new MediaStream();
    let peerEmail: string | null = null;

    function saveCanvas() {
        lastSave = null;
        save().then(() => {
            const now = new Date();
            lastSave = "Last saved at " + now.toLocaleTimeString();
        });
    }

    $: if ($userStore) {
        offeringLoad = true;
    }

    const SAVE_INTERVAL = 5 * 60 * 1000;  // 5 minutes
    setInterval(saveCanvas, SAVE_INTERVAL);
</script>

<div class="flex flex-col w-screen h-screen">
    <div
        class="flex flex-col sm:flex-row flex-wrap justify-center sm:justify-between sm:w-full items-center px-2 border-b bg-white gap-4"
    >
        <div class="flex flex-row gap-8 p-2 items-center justify-center sm:justify-start flex-wrap">
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
            <button
                class={historyEmpty ? "text-gray-400 cursor-default" : ""}
                on:click={undo}><BxUndo /></button
            >
        </div>
        <div class="flex flex-row gap-8 p-2 items-center justify-center sm:justify-end flex-wrap">
            <abbr class="flex flex-row gap-1 items-center" title={$userStore ? "" : "Must be logged in to save canvas"}>
                {#if lastSave}<div class="text-gray-500 whitespace-nowrap" transition:slide={{axis: 'x'}}>{lastSave}</div>{/if}
                <button class="disabled:opacity-50" on:click={saveCanvas} disabled={!$userStore}><BxSave /></button>
            </abbr>
            <button on:click={download}><BxDownload /></button>
            {#if $userStore}
                <div class="text-gray-500">Logged in as {$userStore.email}</div>
                <button class="text-blue-500 hover:underline" on:click={logout}
                    >Log out</button
                >
            {:else}
                <a href="./auth/login" class="text-blue-500 hover:underline"
                    >Log in</a
                >
            {/if}
            <abbr
                class="flex items-center"
                title={$userStore
                    ? ""
                    : "Must be logged in to use video feature"}
            >
                <button
                    class="disabled:opacity-50 relative"
                    on:click={() => (showVideo = !showVideo)}
                    disabled={!$userStore}
                >
                    {#if showVideo}
                        <BxCollapse />
                    {:else}
                        <BxVideo />
                        {#if $connectionStateStore === "connected"}
                            <div class="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
                        {/if}
                    {/if}
                </button>
            </abbr>
        </div>
    </div>

    <div class="relative grow">
        <div
            class="absolute top-0 left-0 flex flex-col h-full w-full bg-gray-100"
        >
            <div class="overflow-scroll">
                <Canvas
                    bind:undo
                    bind:historyEmpty
                    bind:download
                    bind:save
                    bind:load
                    bind:toolState
                    {peerConnection}
                />
            </div>
        </div>
        <textarea
            class="absolute outline-none resize-none bg-transparent"
            style="line-height: 1"
            bind:this={$textBoxInputStore}
        ></textarea>

        {#if showVideo}
            <div
                class="absolute top-0 right-0"
                transition:fade={{ duration: 100 }}
            >
                <VideoBox pc={peerConnection} {remoteStream} bind:peerEmail />
            </div>
        {/if}

        {#if offeringLoad}
            <!-- show dialogue menu centered in screen on top of everything -->
            <div
                class="absolute top-[10%] left-1/2 transform -translate-x-1/2 -translate-y-[10%] bg-white p-4 rounded-lg border border-gray-300 shadow-lg flex flex-col gap-4 p-16 justify-center items-center"
                transition:fade={{ duration: 100 }}
            >
                <div>Do you want to load your most recently saved canvas?</div>
                <div class="flex flex-row gap-4">
                    <button class="px-4 py-2 rounded border drop-shadow bg-white hover:bg-gray-200"
                        on:click={() => (offeringLoad = false)}>No</button
                    >
                    <button class="px-4 py-2 rounded border drop-shadow bg-white hover:bg-gray-200"
                        on:click={() => {
                            offeringLoad = false;
                            load();
                        }}>Yes</button
                    >
                </div>
            </div>
        {/if}
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
