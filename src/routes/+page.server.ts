import { PRIVATE_METERED_API_KEY, PRIVATE_METERED_SECRET_KEY } from "$env/static/private";
import { error, type LoadEvent } from "@sveltejs/kit";

export async function load(event: LoadEvent) {
    // Get turn server info
    const response = await fetch(
        `https://glowworm.metered.live/api/v1/turn/credentials?apiKey=${PRIVATE_METERED_API_KEY}`,
    );
    if (!response.ok) {
        throw error(500, `Got response ${response.status} ${response.statusText} with body ${await response.text()}`);
    }

    const turnServers = await response.json();
    console.log(turnServers);

    return {
        turnServers
    };
}