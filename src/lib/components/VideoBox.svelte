<script lang="ts">
    import { db } from "$lib/firebase";
    import { addDoc, collection, doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
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

    onMount(() => {
        pc.ontrack = (event) => {
            console.log("Got remote track", event);
            for (const track of event.streams[0].getTracks()) {
                remoteStream.addTrack(track);
            }
        }
        remoteVideo.srcObject = remoteStream;
    });

    async function setVideoStream(cameraEnabled: boolean) {
        if (!cameraEnabled) {
            localVideo.srcObject = null;
            videoStream = null;
            return;
        }
        videoStream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: CAMERA_WIDTH },
                height: { ideal: CAMERA_HEIGHT },
            },
        });
        for (const track of videoStream.getVideoTracks()) {
            pc.addTrack(track, videoStream);
            // TODO: Remove tracks when disabling
        }
        localVideo.srcObject = videoStream;
    }

    async function setAudioStream(micEnabled: boolean) {
        if (!micEnabled) {
            audioStream = null;
            return;
        }
        audioStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
        });
        for (const track of audioStream.getAudioTracks()) {
            pc.addTrack(track, audioStream);
            // TODO: Remove tracks when disabling
        }
    }

    $: setVideoStream(cameraEnabled);
    $: setAudioStream(micEnabled);

    async function call() {
        const offerDescription = await pc.createOffer();
        await pc.setLocalDescription(offerDescription);

        // Create db entry with information about offer
        const room = {
            offer: {
                type: offerDescription.type,
                sdp: offerDescription.sdp,
            }
        };
        const roomRef = await addDoc(collection(db, "rooms"), room);
        const offerCandidates = collection(roomRef, "offerCandidates");
        const answerCandidates = collection(roomRef, "answerCandidates");

        pc.onicecandidate = (event) => {
            console.log("Caller got ICE candidate", event.candidate);
            if (event.candidate) {
                addDoc(offerCandidates, event.candidate.toJSON());
            }
        };

        roomID = roomRef.id;

        // Listen for answers
        onSnapshot(roomRef, (snapshot) => {
            const data = snapshot.data();
            console.log("Got updated room: ", data);
            if (!pc.currentRemoteDescription && data?.answer) {
                pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            }
        });

        // Listen for ICE candidates
        onSnapshot(answerCandidates, (snapshot) => {
            for (const change of snapshot.docChanges()) {
                if (change.type === "added") {
                    const candidate = new RTCIceCandidate(change.doc.data());
                    console.log("Got new ICE candidate: ", candidate);
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
            console.log("Room not found");
            return;
        }

        pc.onicecandidate = (event) => {
            console.log("Joiner got ICE candidate", event.candidate);
            if (event.candidate) {
                addDoc(answerCandidates, event.candidate.toJSON());
            }
        }

        const room = roomSnapshot.data();
        console.log("Found room: ", room);
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
                    console.log("Got new ICE candidate: ", candidate);
                    pc.addIceCandidate(candidate);
                }
            }
        });
    }
</script>

<div class="flex flex-col w-1/4">
    <!-- svelte-ignore a11y-media-has-caption -->
    <video
        autoplay
        bind:this={localVideo}
        width={CAMERA_WIDTH}
        height={CAMERA_HEIGHT}
        class="w-full bg-black"
    />
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

    <video
        bind:this={remoteVideo}
        width={CAMERA_WIDTH}
        height={CAMERA_HEIGHT}
        class="w-full bg-black"
    />

    <button class="p-2 border disabled:cursor-not-allowed disabled:opacity-50" on:click={call} disabled={roomID !== null}>Call</button>
    <form on:submit|preventDefault={join}>
        <input type="text" class="disabled:cursor-not-allowed disabled:opacity-50" bind:value={roomToJoin} disabled={roomID !== null} />
        <button type="submit" class="p-2 border disabled:cursor-not-allowed disabled:opacity-50" disabled={roomID !== null}>Join</button>
    </form>
</div>

{#if roomID}
    Current room ID is {roomID}
{/if}
