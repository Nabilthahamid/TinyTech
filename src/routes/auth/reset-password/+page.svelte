<script lang="ts">
  import { UserController } from "$controllers/UserController";
  import { validatePassword } from "$utils/validation";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { onMount } from "svelte";

  let newPassword = "";
  let confirmPassword = "";
  let loading = false;
  let success = false;
  let errors: string[] = [];
  let isValidToken = false;
  let token = "";

  onMount(() => {
    // Get token from URL hash or search params
    const urlParams = new URLSearchParams($page.url.search);
    token = urlParams.get("token") || "";
    
    if (token) {
      isValidToken = true;
    } else {
      errors = ["Invalid or missing reset token"];
    }
  });

  async function handleSubmit() {
    errors = [];
    loading = true;

    // Validate passwords
    const passwordValidation = validatePassword(newPassword);
    const confirmValidation = validatePassword(confirmPassword);

    if (!passwordValidation.isValid || !confirmValidation.isValid) {
      errors = [...passwordValidation.errors, ...confirmValidation.errors];
      loading = false;
      return;
    }

    if (newPassword !== confirmPassword) {
      errors = ["Passwords do not match"];
      loading = false;
      return;
    }

    try {
      await UserController.resetPassword(newPassword);
      success = true;
    } catch (error: any) {
      errors = [error.message || "Failed to reset password"];
    } finally {
      loading = false;
    }
  }

  function goToSignIn() {
    goto("/auth/signin");
  }
</script>

<svelte:head>
  <title>Reset Password - My MVC App</title>
</svelte:head>

<div class="max-w-md mx-auto">
  <div class="bg-white rounded-lg shadow-md p-8">
    {#if success}
      <div class="text-center">
        <div class="mb-6">
          <svg
            class="w-16 h-16 text-green-500 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            ></path>
          </svg>
          <h1 class="text-2xl font-bold text-gray-900 mb-2">
            Password Reset Successful
          </h1>
          <p class="text-gray-600">
            Your password has been successfully reset. You can now sign in with your new password.
          </p>
        </div>

        <button
          on:click={goToSignIn}
          class="w-full btn btn-primary"
        >
          Sign In
        </button>
      </div>
    {:else if !isValidToken}
      <div class="text-center">
        <div class="mb-6">
          <svg
            class="w-16 h-16 text-red-500 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            ></path>
          </svg>
          <h1 class="text-2xl font-bold text-gray-900 mb-2">
            Invalid Reset Link
          </h1>
          <p class="text-gray-600 mb-6">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
        </div>

        <div class="space-y-4">
          <a href="/auth/forgot-password" class="w-full btn btn-primary block text-center">
            Request New Reset Link
          </a>
          <a href="/auth/signin" class="w-full btn btn-secondary block text-center">
            Back to Sign In
          </a>
        </div>
      </div>
    {:else}
      <h1 class="text-2xl font-bold text-gray-900 mb-6 text-center">
        Reset Your Password
      </h1>

      <p class="text-gray-600 mb-6 text-center">
        Enter your new password below.
      </p>

      {#if errors.length > 0}
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <ul class="list-disc list-inside">
            {#each errors as error}
              <li>{error}</li>
            {/each}
          </ul>
        </div>
      {/if}

      <form on:submit|preventDefault={handleSubmit}>
        <div class="mb-4">
          <label for="newPassword" class="block text-sm font-medium text-gray-700 mb-2">
            New Password
          </label>
          <input
            type="password"
            id="newPassword"
            bind:value={newPassword}
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your new password"
          />
        </div>

        <div class="mb-6">
          <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-2">
            Confirm New Password
          </label>
          <input
            type="password"
            id="confirmPassword"
            bind:value={confirmPassword}
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Confirm your new password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          class="w-full btn btn-primary mb-4 disabled:opacity-50"
        >
          {loading ? "Resetting..." : "Reset Password"}
        </button>
      </form>

      <div class="text-center">
        <p class="text-gray-600">
          Remember your password? 
          <a href="/auth/signin" class="text-blue-600 hover:text-blue-800">
            Sign in here
          </a>
        </p>
      </div>
    {/if}
  </div>
</div>
