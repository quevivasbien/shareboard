import { addDoc, collection, CollectionReference, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, setDoc, updateDoc, where } from "firebase/firestore";
import { db } from "./firebase";
import { get } from "svelte/store";
import { userStore } from "./stores";


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
    return new RTCPeerConnection(SERVERS);
}

async function clearCandidates(candidateCollection: CollectionReference) {
    const candidates = await getDocs(candidateCollection);
    const promises: Promise<void>[] = [];
    candidates.forEach((c) => {
        promises.push(deleteDoc(c.ref));
    });
    await Promise.all(promises);
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
    await clearCandidates(offerCandidates);
    await clearCandidates(answerCandidates);

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
    const guestPendingCalls = collection(db, "rooms", guestEmail, "invitations");
    await addDoc(guestPendingCalls, { hostEmail: user.email });

    return guestEmail;
}

export async function joinCall(pc: RTCPeerConnection, hostEmail: string) {
    const user = get(userStore);
    if (!user || !user.email) {
        console.error("Tried to join call while not logged in");
        return null;
    }
    
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
    await deleteDoc(doc(pendingCallsCollection, hostEmail));
    
    return hostEmail;
}
