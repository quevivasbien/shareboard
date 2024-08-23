<script lang="ts">
    import { goto } from "$app/navigation";
    import { userStore } from "$lib/stores";
    import { createUser } from "$lib/firebase";
    import type { FirebaseError } from "firebase/app";
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
        if (pass != passConfirm) {
            statusText = "Password does not match";
            return;
        }
        const error = await createUser(email, pass);
        if (error) {
            const code = (error as FirebaseError).code;
            switch (code) {
                case "auth/email-already-in-use":
                    statusText = "Email is already in use";
                    break;
                case "auth/invalid-email":
                    statusText = "Invalid email address";
                    break;
                case "auth/weak-password":
                    statusText = "Weak password: password should be at least 6 characters";
                    break;
                default:
                    statusText = "Invalid email and/or password";
            }
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

        <label for="passConfirm" class="text-right">Confirm password</label>
        <input
            class="col-span-2 p-2 rounded-sm drop-shadow text-center font-bold"
            type="password"
            name="passConfirm"
            bind:value={passConfirm}
        />
    </div>
    <div class="max-w-md mx-auto text-right">
        <button type="submit" class="p-2 m-2 border rounded bg-gray-50 hover:bg-gray-100">Sign up</button>
    </div>
    {#if statusText}
        <div class="text-red-500 font-bold p-2 text-center" transition:slide>
            {statusText}
        </div>
    {/if}
</form>
<div class="max-w-md mx-auto text-center">
    Already have an account? <a class="text-blue-500 hover:underline" href="./login">Sign in</a>.
</div>
