<script lang="ts">
    import { onMount } from "svelte";
    import { startCall, joinCall, deleteInvitation } from "$lib/webrtc";
    import {
        BxCamera,
        BxCameraOff,
        BxMicrophone,
        BxMicrophoneOff,
    } from "svelte-boxicons";
    import { db } from "$lib/firebase";
    import {
        connectionStateStore,
        userIsHostStore,
        userStore,
    } from "$lib/stores";
    import { collection, onSnapshot } from "firebase/firestore";
    import { slide } from "svelte/transition";

    export let pc: RTCPeerConnection; // bound value
    export let remoteStream: MediaStream;
    export let peerEmail: string | null; // bound value
    export let saveCanvasState: () => Promise<void>;

    const CAMERA_WIDTH = 640;
    const CAMERA_HEIGHT = 480;

    let localVideo: HTMLVideoElement;
    let videoStream: MediaStream | null = null;
    let audioStream: MediaStream | null = null;
    let cameraEnabled = true;
    let micEnabled = true;

    let remoteVideo: HTMLVideoElement;

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

        remoteVideo.srcObject = remoteStream;

        pc.ontrack = (event) => {
            for (const track of event.streams[0].getTracks()) {
                remoteStream.addTrack(track);
            }
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

    let guestEmail = "";

    interface PendingCall {
        invitationID: string;
        hostEmail: string;
        createdTime: string;
    }
    let pendingCalls: PendingCall[] = [];

    function minutesSince(time: string) {
        const now = new Date();
        const created = new Date(time);
        const diff = now.getTime() - created.getTime();
        const minutes = Math.floor(diff / 1000 / 60);
        return minutes < 1 ? "<1 m" : minutes > 60 ? ">1 hr" : minutes + " m";
    }

    // Watch pending calls
    onMount(() => {
        if (!$userStore?.email) {
            console.error("User not logged in when mounting VideoBox");
            return;
        }
        const pendingCallsCollection = collection(
            db,
            "rooms",
            $userStore.email,
            "invitations",
        );
        onSnapshot(pendingCallsCollection, (snapshot) => {
            console.log("Found", snapshot.size, "new pending calls");
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const call = change.doc.data();
                    call.invitationID = change.doc.id;
                    console.log("Found new pending call", call);
                    pendingCalls = [...pendingCalls, call as PendingCall];
                } else if (change.type === "removed") {
                    pendingCalls = pendingCalls.filter(
                        (call) => call.invitationID !== change.doc.id,
                    );
                }
            });
        });
    });

    let errorMessage: string | null = null;
    $: if (errorMessage) {
        setTimeout(() => {
            errorMessage = null;
        }, 3000);
    }

    let disableGuestEmailForm = false;
    let invitationID: string | null = null;
    async function start() {
        $userIsHostStore = true;
        disableGuestEmailForm = true;
        const result = await startCall(pc, guestEmail);
        disableGuestEmailForm = false;
        if (!result.ok) {
            errorMessage = result.error;
            return;
        }
        invitationID = result.value;
        peerEmail = guestEmail;
    }

    async function join(pendingCall: PendingCall) {
        $userIsHostStore = false;
        const result = await joinCall(
            pc,
            pendingCall.hostEmail,
            pendingCall.invitationID,
        );
        if (!result.ok) {
            errorMessage = result.error;
            return;
        }
        peerEmail = result.value;
    }

    function cancelInvite() {
        if (!$userStore?.email) {
            console.error("User not logged in when canceling invite");
            return;
        }
        if (!invitationID) {
            console.error("No invitation ID to cancel");
            return;
        }
        deleteInvitation($userStore.email, invitationID);
        saveCanvasState().then(() => {
            localStorage.setItem("autoLoad", "true");
            location.reload();
        });
    }

    let statusMessage: string;
    $: {
        const connectionState = $connectionStateStore;
        if (connectionState === "connected") {
            statusMessage = "Connected";
        } else if (connectionState === "new") {
            statusMessage = "Connecting"
        } else if (connectionState === "connecting") {
            statusMessage = "Connecting...";
        } else {
            statusMessage = "Disconnected. Resetting...";
            saveCanvasState();
            setTimeout(() => {
                localStorage.setItem("autoLoad", "true");
                location.reload();
            }, 2000);
        }
    }

    function endCall() {
        // TODO. Make this more smooth.
        saveCanvasState().then(() => {
            localStorage.setItem("autoLoad", "true");
            location.reload();
        });
    }

    // TODO: Add ability to reject pending call
</script>

<!-- TODO: Allow for video box to be resized -->
<div
    class="flex flex-col gap-2 px-2 bg-white m-2 p-2 drop-shadow"
    style="width: {CAMERA_WIDTH}px;"
>
    <div class="relative" style="height: {CAMERA_HEIGHT}px;">
        <!-- svelte-ignore a11y-media-has-caption -->
        <video
            autoplay
            bind:this={remoteVideo}
            width={CAMERA_WIDTH}
            height={CAMERA_HEIGHT}
            class="bg-black absolute top-0 left-0"
            style="display: ${$connectionStateStore === 'connected'
                ? 'block'
                : 'none'}"
        />
        <!-- svelte-ignore a11y-media-has-caption -->
        <video
            autoplay
            bind:this={localVideo}
            width={$connectionStateStore === "connected"
                ? CAMERA_WIDTH / 3
                : CAMERA_WIDTH}
            height={$connectionStateStore === "connected"
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

    {#if peerEmail === null}
        <form class="flex flex-row gap-2" on:submit|preventDefault={start}>
            <input
                type="text"
                class="p-2 border rounded disabled:cursor-not-allowed disabled:opacity-50 w-full"
                bind:value={guestEmail}
                disabled={disableGuestEmailForm}
                placeholder="Guest's Email"
            />
            <button
                type="submit"
                class="py-2 px-8 border-2 rounded disabled:cursor-not-allowed disabled:opacity-50 bg-white hover:bg-gray-100 text-nowrap"
                disabled={disableGuestEmailForm}>Create Room</button
            >
        </form>
        {#if !$userIsHostStore && pendingCalls.length > 0}
            <div class="p-2 w-full flex flex-col gap-2" transition:slide>
                <div class="text-gray-700 font-bold text-center">
                    Pending Calls
                </div>
                {#each pendingCalls as pendingCall}
                    <button
                        class="m-2 p-2 border-y hover:border-blue-500 w-full flex flex-row justify-between"
                        on:click={() => join(pendingCall)}
                        transition:slide
                    >
                        <div class="flex flex-row gap-2">
                            <span>{pendingCall.hostEmail}</span><span
                                class="text-gray-500"
                                >{minutesSince(pendingCall.createdTime)} ago</span
                            >
                        </div>
                        <div>Join</div>
                    </button>
                {/each}
            </div>
        {/if}
    {:else}
        <div class="p-2 border-t w-full flex flex-row items-center justify-between">
            {#if $userIsHostStore && $connectionStateStore === "new"}
                <div class="p-2">Waiting for guest to join...</div>
                <button
                    class="py-2 px-8 border-2 rounded disabled:cursor-not-allowed disabled:opacity-50 bg-white hover:bg-gray-100 text-nowrap"
                    on:click={cancelInvite}
                >
                    Cancel
                </button>
            {:else}
                <div class="p-2">
                    {statusMessage}
                </div>
                {#if statusMessage === "Connected"}
                    <button class="py-2 px-8 border-2 rounded disabled:cursor-not-allowed disabled:opacity-50 bg-white hover:bg-gray-100 text-nowrap" on:click={endCall}>
                        End Call
                    </button>
                {/if}
            {/if}
        </div>
    {/if}
    {#if errorMessage}
        <div class="p-2 text-red-500" transition:slide>
            {errorMessage}
        </div>
    {/if}
</div>
