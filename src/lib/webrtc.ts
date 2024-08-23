import { addDoc, collection, CollectionReference, deleteDoc, doc, DocumentReference, getDoc, getDocs, onSnapshot, query, setDoc, updateDoc, where } from "firebase/firestore";
import { db } from "./firebase";
import { get } from "svelte/store";
import { textBoxInputStore, userStore } from "./stores";


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

export async function startCall(pc: RTCPeerConnection) {
    const user = get(userStore);
    if (!user) {
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

    // TODO: Handle cases where room already exists
    const roomRef = doc(db, "rooms", user.uid);
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

    return roomRef.id;
}

export async function joinCall(pc: RTCPeerConnection, host: string) {
    const user = get(userStore);
    if (!user || !user.email) {
        console.error("Tried to join call while not logged in");
        return;
    }
    const roomRef = doc(db, "rooms", host);
    const offerCandidates = collection(roomRef, "offerCandidates");
    const answerCandidates = collection(roomRef, "answerCandidates");

    const roomSnapshot = await getDoc(roomRef);
    if (!roomSnapshot.exists()) {
        return false;
    }
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
    
    return true;
}
