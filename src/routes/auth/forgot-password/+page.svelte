<script lang="ts">
  import { UserController } from "$controllers/UserController";
  import { validateEmail } from "$utils/validation";
  import { goto } from "$app/navigation";

  let email = "";
  let loading = false;
  let success = false;
  let errors: string[] = [];

  async function handleSubmit() {
    errors = [];
    loading = true;

    // Validate email
    const emailValidation = validateEmail(email);

    if (!emailValidation.isValid) {
      errors = emailValidation.errors;
      loading = false;
      return;
    }

    try {
      await UserController.forgotPassword(email);
      success = true;
    } catch (error: any) {
      errors = [error.message || "Failed to send reset email"];
    } finally {
      loading = false;
    }
  }

  function goToSignIn() {
    goto("/auth/signin");
  }
</script>

<svelte:head>
  <title>Forgot Password - My MVC App</title>
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
            Check Your Email
          </h1>
          <p class="text-gray-600">
            We've sent a password reset link to <strong>{email}</strong>
          </p>
        </div>

        <div class="space-y-4">
          <p class="text-sm text-gray-500">
            Didn't receive the email? Check your spam folder or try again.
          </p>
          <button
            on:click={goToSignIn}
            class="w-full btn btn-primary"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    {:else}
      <h1 class="text-2xl font-bold text-gray-900 mb-6 text-center">
        Forgot Password?
      </h1>

      <p class="text-gray-600 mb-6 text-center">
        Enter your email address and we'll send you a link to reset your password.
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
        <div class="mb-6">
          <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            bind:value={email}
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your email address"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          class="w-full btn btn-primary mb-4 disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send Reset Link"}
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
