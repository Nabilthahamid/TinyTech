<script lang="ts">
  import { UserController } from '$controllers/UserController';
  import { validateEmail, validatePassword } from '$utils/validation';
  import { goto } from '$app/navigation';

  let email = '';
  let password = '';
  let loading = false;
  let errors: string[] = [];

  async function handleSubmit() {
    errors = [];
    loading = true;

    // Validate inputs
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password);

    if (!emailValidation.isValid || !passwordValidation.isValid) {
      errors = [...emailValidation.errors, ...passwordValidation.errors];
      loading = false;
      return;
    }

    try {
      await UserController.signIn(email, password);
      goto('/');
    } catch (error: any) {
      errors = [error.message || 'Sign in failed'];
    } finally {
      loading = false;
    }
  }

  async function handleGoogleSignIn() {
    try {
      await UserController.signInWithGoogle();
    } catch (error: any) {
      errors = [error.message || 'Google sign in failed'];
    }
  }
</script>

<svelte:head>
  <title>Sign In - My MVC App</title>
</svelte:head>

<div class="max-w-md mx-auto">
  <div class="bg-white rounded-lg shadow-md p-8">
    <h1 class="text-2xl font-bold text-gray-900 mb-6 text-center">Sign In</h1>

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
        <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
          Email
        </label>
        <input
          type="email"
          id="email"
          bind:value={email}
          required
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter your email"
        />
      </div>

      <div class="mb-6">
        <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
          Password
        </label>
        <input
          type="password"
          id="password"
          bind:value={password}
          required
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter your password"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        class="w-full btn btn-primary mb-4 disabled:opacity-50"
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>

    <div class="text-center">
      <p class="text-gray-600 mb-4">Or</p>
      <button
        on:click={handleGoogleSignIn}
        class="w-full btn btn-secondary mb-4"
      >
        Sign in with Google
      </button>
    </div>

    <div class="text-center space-y-2">
      <p class="text-gray-600">
        <a href="/auth/forgot-password" class="text-blue-600 hover:text-blue-800">
          Forgot your password?
        </a>
      </p>
      <p class="text-gray-600">
        Don't have an account? 
        <a href="/auth/signup" class="text-blue-600 hover:text-blue-800">
          Sign up here
        </a>
      </p>
    </div>
  </div>
</div>
