import { addDoc, collection, CollectionReference, deleteDoc, doc, getDoc, getDocs, onSnapshot, Query, query, setDoc, updateDoc, where } from "firebase/firestore";
import { db } from "./firebase";
import { get } from "svelte/store";
import { connectionStateStore, userIsHostStore, userStore } from "./stores";
import * as Result from "./result";


export function getRTCPeerConnection(servers: RTCConfiguration) {
    let pc = new RTCPeerConnection(servers);
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
        return Result.err("You must be logged in to send an invitation.");
    }
    const guestPendingCalls = collection(db, "rooms", guestEmail, "invitations");
    // If there are any previous invitations, delete them
    const q = query(guestPendingCalls, where("hostEmail", "==", user.email));
    await deleteDocs(q);
    const doc = await addDoc(guestPendingCalls, { hostEmail: user.email, createdTime });
    return Result.ok(doc.id);
}

export async function startCall(pc: RTCPeerConnection, guestEmail: string) {
    const user = get(userStore);
    if (!user || !user.email) {
        return Result.err("You must be logged in to start a call.");
    }
    // Check that email belongs to a registered user first
    const userRef = doc(db, "users", guestEmail);
    if (!(await getDoc(userRef)).exists()) {
        return Result.err(`The email ${guestEmail} is not associated with a registered user.`);
    }

    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription);

    // Create db entry with information about offer
    const room = {
        createdTime: new Date().toISOString(),
        bothPresent: false,
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
    const invitationID = await sendInvite(guestEmail, room.createdTime);

    if (invitationID.ok) {
        addEventListener("beforeunload", () => {
            // Make sure the call is cancelled/deleted if the host leaves the page
            deleteCall(guestEmail, invitationID.value);
        });
    }

    return invitationID;
}

export async function joinCall(pc: RTCPeerConnection, hostEmail: string, invitationID: string) {
    const user = get(userStore);
    if (!user || !user.email) {
        return Result.err("You must be logged in to join a call.");
    }
    console.log(`Joining call with ID ${invitationID} from ${hostEmail}`);
    
    const roomRef = doc(db, "rooms", hostEmail, "hosted", user.email);
    const offerCandidates = collection(roomRef, "offerCandidates");
    const answerCandidates = collection(roomRef, "answerCandidates");
    
    const roomSnapshot = await getDoc(roomRef);
    const room = roomSnapshot.data();
    if (!room) {
        // remove invitation, since it's invalid
        deleteInvitation(user.email, invitationID);
        return Result.err("Call not found. It might have been cancelled by the host.");
    }
    
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            addDoc(answerCandidates, event.candidate.toJSON());
        }
    };
    await pc.setRemoteDescription(new RTCSessionDescription(room.offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await updateDoc(roomRef, {
        answer: {
            type: answer.type,
            sdp: answer.sdp,
        },
        bothPresent: true,
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
    deleteInvitation(user.email, invitationID);
    
    return Result.ok(hostEmail);
}

export function deleteInvitation(guestEmail: string, invitationID: string) {
    const invitationRef = doc(db, "rooms", guestEmail, "invitations", invitationID);
    return deleteDoc(invitationRef);
}

export function deleteCall(peerEmail: string, invitationID: string | null = null) {
    const user = get(userStore);
    const userIsHost = get(userIsHostStore);
    if (!user || !user.email) {
        console.error("Tried to delete call while not logged in");
        return;
    }
    console.log(`Deleting call with ${peerEmail}`);
    const roomRef = userIsHost ? doc(db, "rooms", user.email, "hosted", peerEmail) : doc(db, "rooms", peerEmail, "hosted", user.email);
    deleteDoc(roomRef);
    if (invitationID) {
        deleteInvitation(userIsHost ? peerEmail : user.email, invitationID);
    }
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
