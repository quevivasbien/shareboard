<script lang="ts">
    import { onMount } from "svelte";
    import { startCall, joinCall } from "$lib/webrtc";
    import {
        BxCamera,
        BxCameraOff,
        BxCheckCircle,
        BxCopy,
        BxMicrophone,
        BxMicrophoneOff,
    } from "svelte-boxicons";

    export let pc: RTCPeerConnection;

    const CAMERA_WIDTH = 640;
    const CAMERA_HEIGHT = 480;

    let roomID: string | null = null;

    let localVideo: HTMLVideoElement;
    let videoStream: MediaStream | null = null;
    let audioStream: MediaStream | null = null;
    let cameraEnabled = true;
    let micEnabled = true;

    let remoteVideo: HTMLVideoElement;
    let remoteStream = new MediaStream();

    let connectionState = "disconnected";

    async function getVideoStream() {
        const videoStream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: CAMERA_WIDTH },
                height: { ideal: CAMERA_HEIGHT },
            },
        });
        for (const track of videoStream.getVideoTracks()) {
            pc.addTrack(track, videoStream);
        }

        return videoStream;
    }

    async function getAudioStream() {
        const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
        });
        for (const track of audioStream.getAudioTracks()) {
            pc.addTrack(track, audioStream);
        }

        return audioStream;
    }

    onMount(() => {
        if (cameraEnabled) {
            getVideoStream();
        }
        if (micEnabled) {
            getAudioStream();
        }

        pc.ontrack = (event) => {
            for (const track of event.streams[0].getTracks()) {
                remoteStream.addTrack(track);
            }
            remoteVideo.srcObject = remoteStream;
        };
        pc.onconnectionstatechange = () => {
            connectionState = pc.connectionState;
        };
    });

    async function setCamera(cameraEnabled: boolean) {
        if (!videoStream) {
            videoStream = await getVideoStream();
        }
        pc.getSenders().forEach((sender) => {
            if (sender.track && sender.track.kind === "video") {
                sender.track.enabled = cameraEnabled;
            }
        });
        if (!cameraEnabled) {
            localVideo.srcObject = null;
            videoStream.getTracks().forEach((track) => (track.enabled = false));
            return;
        }
        videoStream.getTracks().forEach((track) => (track.enabled = true));
        localVideo.srcObject = videoStream;
    }

    async function setAudioStream(micEnabled: boolean) {
        if (!audioStream) {
            audioStream = await getAudioStream();
        }
        audioStream
            .getAudioTracks()
            .forEach((track) => (track.enabled = micEnabled));
        pc.getSenders().forEach((sender) => {
            if (sender.track && sender.track.kind === "audio") {
                sender.track.enabled = micEnabled;
            }
        });
    }

    $: setCamera(cameraEnabled);
    $: setAudioStream(micEnabled);

    let roomToJoin = "";
    let amHost = false;

    let roomIDCopied = false;
    function copyRoomID() {
        if (!roomID) {
            console.error("Tried to copy roomID but it was null");
            return;
        }
        navigator.clipboard.writeText(roomID);
        roomIDCopied = true;
    }
</script>

<div class="flex flex-col gap-2 px-2 bg-white m-2 p-2 drop-shadow" style="width: {CAMERA_WIDTH}px;">
    <div
        class="relative"
        style="height: {CAMERA_HEIGHT}px;"
    >
        <!-- svelte-ignore a11y-media-has-caption -->
        <video
            autoplay
            bind:this={remoteVideo}
            width={CAMERA_WIDTH}
            height={CAMERA_HEIGHT}
            class="bg-black absolute top-0 left-0"
            style="display: ${connectionState === 'connected'
                ? 'block'
                : 'none'}"
        />
        <!-- svelte-ignore a11y-media-has-caption -->
        <video
            autoplay
            bind:this={localVideo}
            width={connectionState === "connected"
                ? CAMERA_WIDTH / 3
                : CAMERA_WIDTH}
            height={connectionState === "connected"
                ? CAMERA_HEIGHT / 3
                : CAMERA_HEIGHT}
            class="bg-black absolute top-0 right-0"
        />
    </div>
    <div class="flex flex-row gap-2 justify-end">
        <label class="cursor-pointer">
            <input type="checkbox" bind:checked={cameraEnabled} hidden />
            {#if cameraEnabled}<BxCamera />{:else}<BxCameraOff />{/if}
        </label>
        <label class="cursor-pointer">
            <input type="checkbox" bind:checked={micEnabled} hidden />
            {#if micEnabled}<BxMicrophone />{:else}<BxMicrophoneOff />{/if}
        </label>
    </div>

    {#if roomID === null}
        <button
            class="p-2 border rounded disabled:cursor-not-allowed disabled:opacity-50 bg-white hover:bg-gray-100"
            on:click={() => {
                amHost = true;
                startCall(pc).then((result) => (roomID = result));
            }}
            disabled={roomID !== null}>Create Room</button
        >
        <form
            class="flex flex-row gap-2"
            on:submit|preventDefault={() => {
                amHost = false;
                joinCall(pc, roomToJoin).then((success) =>
                    success ? (roomID = roomToJoin) : (roomID = null),
                );
            }}
        >
            <input
                type="text"
                class="p-2 border rounded disabled:cursor-not-allowed disabled:opacity-50 w-full"
                bind:value={roomToJoin}
                disabled={roomID !== null}
                placeholder="Room ID"
            />
            <button
                type="submit"
                class="py-2 px-8 border rounded disabled:cursor-not-allowed disabled:opacity-50 bg-white hover:bg-gray-100"
                disabled={roomID !== null}>Join</button
            >
        </form>
    {:else if amHost && connectionState === "disconnected"}
        <div class="p-2 border rounded w-full flex flex-row justify-between">
            <div>
                Room ID is <button class="text-gray-700" on:click={copyRoomID}
                    >{roomID}</button
                >
            </div>
            <div class="flex flex-row gap-2">
                <button on:click={copyRoomID}>
                    <BxCopy />
                </button>
                {#if roomIDCopied}<BxCheckCircle />{/if}
            </div>
        </div>
    {/if}
</div>
