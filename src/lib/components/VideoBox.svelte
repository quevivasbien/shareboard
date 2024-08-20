<script lang="ts">
    import { db } from "$lib/firebase";
    import {
        addDoc,
        collection,
        doc,
        getDoc,
        onSnapshot,
        updateDoc,
    } from "firebase/firestore";
    import { onMount } from "svelte";

    const CAMERA_WIDTH = 640;
    const CAMERA_HEIGHT = 480;

    const SERVERS = {
        iceServers: [
            {
                urls: [
                    "stun:stun1.l.google.com:19302",
                    "stun:stun2.l.google.com:19302",
                ],
            },
        ],
        iceCandidatePoolSize: 10,
    };

    const pc = new RTCPeerConnection(SERVERS);
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

    async function call() {
        const offerDescription = await pc.createOffer();
        await pc.setLocalDescription(offerDescription);

        // Create db entry with information about offer
        const room = {
            offer: {
                type: offerDescription.type,
                sdp: offerDescription.sdp,
            },
        };
        const roomRef = await addDoc(collection(db, "rooms"), room);
        const offerCandidates = collection(roomRef, "offerCandidates");
        const answerCandidates = collection(roomRef, "answerCandidates");

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                addDoc(offerCandidates, event.candidate.toJSON());
            }
        };

        roomID = roomRef.id;

        // Listen for answers
        onSnapshot(roomRef, (snapshot) => {
            const data = snapshot.data();
            if (!pc.currentRemoteDescription && data?.answer) {
                pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            }
        });

        // Listen for ICE candidates
        onSnapshot(answerCandidates, (snapshot) => {
            for (const change of snapshot.docChanges()) {
                if (change.type === "added") {
                    const candidate = new RTCIceCandidate(change.doc.data());
                    pc.addIceCandidate(candidate);
                }
            }
        });
    }

    let roomToJoin = "";

    async function join() {
        const roomRef = doc(db, "rooms", roomToJoin);
        const offerCandidates = collection(roomRef, "offerCandidates");
        const answerCandidates = collection(roomRef, "answerCandidates");

        const roomSnapshot = await getDoc(roomRef);
        if (!roomSnapshot.exists()) {
            return;
        }
        roomID = roomToJoin;

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                addDoc(answerCandidates, event.candidate.toJSON());
            }
        };

        const room = roomSnapshot.data();
        await pc.setRemoteDescription(new RTCSessionDescription(room.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await updateDoc(roomRef, {
            answer: {
                type: answer.type,
                sdp: answer.sdp,
            },
        });

        onSnapshot(offerCandidates, (snapshot) => {
            for (const change of snapshot.docChanges()) {
                if (change.type === "added") {
                    const candidate = new RTCIceCandidate(change.doc.data());
                    pc.addIceCandidate(candidate);
                }
            }
        });
    }
</script>

<div class="flex flex-col" style="width: {CAMERA_WIDTH}px;">
    <div class="relative" style="width: {CAMERA_WIDTH}px; height: {CAMERA_HEIGHT}px;">
        <!-- svelte-ignore a11y-media-has-caption -->
        <video
            autoplay
            bind:this={remoteVideo}
            width={CAMERA_WIDTH}
            height={CAMERA_HEIGHT}
            class="bg-black absolute top-0 left-0"
            style="display: ${connectionState === 'connected' ? 'block' : 'none'}"
        />
        <!-- svelte-ignore a11y-media-has-caption -->
        <video
            autoplay
            bind:this={localVideo}
            width={connectionState === 'connected' ? CAMERA_WIDTH / 3 : CAMERA_WIDTH}
            height={connectionState === 'connected' ? CAMERA_HEIGHT / 3 : CAMERA_HEIGHT}
            class="bg-black absolute bottom-0 right-0"
        />
    </div>
    <div class="flex flex-row gap-2 justify-end">
        <label>
            <input type="checkbox" bind:checked={cameraEnabled} />
            Camera
        </label>
        <label>
            <input type="checkbox" bind:checked={micEnabled} />
            Microphone
        </label>
    </div>

    <button
        class="p-2 border disabled:cursor-not-allowed disabled:opacity-50"
        on:click={call}
        disabled={roomID !== null}>Call</button
    >
    <form on:submit|preventDefault={join}>
        <input
            type="text"
            class="disabled:cursor-not-allowed disabled:opacity-50"
            bind:value={roomToJoin}
            disabled={roomID !== null}
        />
        <button
            type="submit"
            class="p-2 border disabled:cursor-not-allowed disabled:opacity-50"
            disabled={roomID !== null}>Join</button
        >
    </form>
</div>

{#if roomID}
    Current room ID is {roomID}
{/if}
