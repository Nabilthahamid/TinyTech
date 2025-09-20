<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";

  let error = "";

  // Get error from URL parameters
  if (typeof window !== "undefined") {
    const urlParams = new URLSearchParams($page.url.search);
    error = urlParams.get("error") || "An unknown error occurred";
  }

  function goToSignIn() {
    goto("/auth/signin");
  }
</script>

<svelte:head>
  <title>Authentication Error - My MVC App</title>
</svelte:head>

<div class="max-w-md mx-auto">
  <div class="bg-white rounded-lg shadow-md p-8">
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
          Authentication Error
        </h1>
        <p class="text-gray-600 mb-6">
          {error}
        </p>
      </div>

      <div class="space-y-4">
        <button
          on:click={goToSignIn}
          class="w-full btn btn-primary"
        >
          Try Again
        </button>
        <a href="/" class="w-full btn btn-secondary block text-center">
          Go Home
        </a>
      </div>
    </div>
  </div>
</div>
