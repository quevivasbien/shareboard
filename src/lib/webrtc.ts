import { addDoc, collection, CollectionReference, deleteDoc, doc, getDoc, getDocs, onSnapshot, Query, query, setDoc, updateDoc, where } from "firebase/firestore";
import { db } from "./firebase";
import { get } from "svelte/store";
import { connectionStateStore, userStore } from "./stores";


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

export function getRTCPeerConnection() {
    let pc = new RTCPeerConnection(SERVERS);
    pc.onnegotiationneeded = () => {
        console.log("Negotiation needed");
    }
    pc.onconnectionstatechange = () => {
        console.log("Connection state changed to", pc.connectionState);
        connectionStateStore.set(pc.connectionState);
        if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
            closeConnection(pc);
        }
    }
    pc.oniceconnectionstatechange = () => {
        console.log("ICE connection state changed to", pc.iceConnectionState);
    }
    pc.onsignalingstatechange = () => {
        console.log("Signaling state changed to", pc.signalingState);
    }
    addEventListener("beforeunload", () => {
        closeConnection(pc);
    });
    return pc;
}

async function deleteDocs(refs: CollectionReference | Query) {
    const candidates = await getDocs(refs);
    const promises: Promise<void>[] = [];
    candidates.forEach((doc) => {
        promises.push(deleteDoc(doc.ref));
    });
    await Promise.all(promises);
}

async function sendInvite(guestEmail: string, createdTime: string) {
    const user = get(userStore);
    if (!user || !user.email) {
        console.error("Tried to send invite while not logged in");
        return;
    }
    const guestPendingCalls = collection(db, "rooms", guestEmail, "invitations");
    // If there are any previous invitations, delete them
    const q = query(guestPendingCalls, where("hostEmail", "==", user.email));
    await deleteDocs(q);
    await addDoc(guestPendingCalls, { hostEmail: user.email, createdTime });
}

export async function startCall(pc: RTCPeerConnection, guestEmail: string) {
    const user = get(userStore);
    if (!user || !user.email) {
        console.error("Tried to start call while not logged in");
        return null;
    }
    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription);

    // Create db entry with information about offer
    const room = {
        createdTime: new Date().toISOString(),
        offer: {
            type: offerDescription.type,
            sdp: offerDescription.sdp,
        },
    };

    // Look for a pre-existing room with the same host and guest
    const roomRef = doc(db, "rooms", user.email, "hosted", guestEmail);
    await setDoc(roomRef, room);
    const offerCandidates = collection(roomRef, "offerCandidates");
    const answerCandidates = collection(roomRef, "answerCandidates");

    // Get rid of any candidates from previous calls
    await deleteDocs(offerCandidates);
    await deleteDocs(answerCandidates);

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            addDoc(offerCandidates, event.candidate.toJSON());
        }
    };

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

    // Update list of pending calls for guest
    await sendInvite(guestEmail, room.createdTime);

    return guestEmail;
}

export async function joinCall(pc: RTCPeerConnection, hostEmail: string, invitationID: string) {
    const user = get(userStore);
    if (!user || !user.email) {
        console.error("Tried to join call while not logged in");
        return null;
    }
    console.log(`Joining call with ID ${invitationID} from ${hostEmail}`);
    
    const roomRef = doc(db, "rooms", hostEmail, "hosted", user.email);
    const offerCandidates = collection(roomRef, "offerCandidates");
    const answerCandidates = collection(roomRef, "answerCandidates");

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            addDoc(answerCandidates, event.candidate.toJSON());
        }
    };

    const roomSnapshot = await getDoc(roomRef);
    const room = roomSnapshot.data();
    if (!room) {
        console.log("Room doesn't exist");
        return null;
    }
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

    // Remove invitation
    const pendingCallsCollection = collection(db, "rooms", user.email, "invitations");
    await deleteDoc(doc(pendingCallsCollection, invitationID));
    
    return hostEmail;
}

export function closeConnection(pc: RTCPeerConnection) {
    if (pc.connectionState === "new" || pc.connectionState === "closed") {
        // No need to close a new connection or one that's already closed
        return;
    }
    console.log(`Closing RTC peer connection from state ${pc.connectionState}`);
    pc.getSenders().forEach((sender) => {
        sender.track?.stop();
    });
    pc.getReceivers().forEach((receiver) => {
        receiver.track?.stop();
    });
    pc.onnegotiationneeded = null;
    pc.onconnectionstatechange = null;
    pc.oniceconnectionstatechange = null;
    pc.onicecandidate = null;
    pc.onsignalingstatechange = null;
    pc.ontrack = null;
    pc.close();
}
