<script lang="ts">
    import { goto } from "$app/navigation";
    import { userStore } from "$lib/stores";
    import { login } from "$lib/firebase";
    import { onMount } from "svelte";
    import { slide } from "svelte/transition";

    let email: string;
    let pass: string;
    let passConfirm: string;
    let statusText = "";

    async function submit() {
        if (!email || !pass) {
            return;
        }
        const error = await login(email, pass);
        if (error) {
            statusText = "Invalid email and/or password";
        } else {
            goto(`/`);
        }
    }

    onMount(() => {
        if ($userStore) {
            console.log("Already logged in; navigating to home...");
            goto(`/`);
        }
    });
</script>

<h1 class="m-8 text-center font-bold text-xl">Login</h1>
<form on:submit|preventDefault={submit} class="m-8">
    <div
        class="grid grid-cols-3 gap-4 border rounded items-center bg-gray-50 p-4 max-w-lg mx-auto"
    >

        <label for="email" class="text-right">Email</label>
        <input
            class="col-span-2 p-2 rounded-sm drop-shadow text-center font-bold"
            type="email"
            placeholder="email@example.com"
            name="email"
            bind:value={email}
        />

        <label for="pass" class="text-right">Password</label>
        <input
            class="col-span-2 p-2 rounded-sm drop-shadow text-center font-bold"
            type="password"
            name="pass"
            bind:value={pass}
        />
    </div>
    <div class="max-w-md mx-auto text-right">
        <button type="submit" class="p-2 m-2 border rounded bg-gray-50 hover:bg-gray-100">Sign in</button>
    </div>
    {#if statusText}
        <div class="text-red-500 font-bold p-2 text-center" transition:slide>
            {statusText}
        </div>
    {/if}
</form>