<script lang="ts">
  import { UserController } from '$controllers/UserController';
  import { validateEmail, validatePassword, validateRequired } from '$utils/validation';
  import { goto } from '$app/navigation';

  let name = '';
  let email = '';
  let password = '';
  let confirmPassword = '';
  let loading = false;
  let errors: string[] = [];

  async function handleSubmit() {
    errors = [];
    loading = true;

    // Validate inputs
    const nameValidation = validateRequired(name, 'Name');
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password);

    if (!nameValidation.isValid || !emailValidation.isValid || !passwordValidation.isValid) {
      errors = [...nameValidation.errors, ...emailValidation.errors, ...passwordValidation.errors];
      loading = false;
      return;
    }

    if (password !== confirmPassword) {
      errors.push('Passwords do not match');
      loading = false;
      return;
    }

    try {
      await UserController.createUser({ name, email, password });
      goto('/');
    } catch (error: any) {
      errors = [error.message || 'Sign up failed'];
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Sign Up - My MVC App</title>
</svelte:head>

<div class="max-w-md mx-auto">
  <div class="bg-white rounded-lg shadow-md p-8">
    <h1 class="text-2xl font-bold text-gray-900 mb-6 text-center">Sign Up</h1>

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
        <label for="name" class="block text-sm font-medium text-gray-700 mb-2">
          Name
        </label>
        <input
          type="text"
          id="name"
          bind:value={name}
          required
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter your name"
        />
      </div>

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

      <div class="mb-4">
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

      <div class="mb-6">
        <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-2">
          Confirm Password
        </label>
        <input
          type="password"
          id="confirmPassword"
          bind:value={confirmPassword}
          required
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Confirm your password"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        class="w-full btn btn-primary mb-4 disabled:opacity-50"
      >
        {loading ? 'Creating account...' : 'Sign Up'}
      </button>
    </form>

    <div class="text-center">
      <p class="text-gray-600">
        Already have an account? 
        <a href="/auth/signin" class="text-blue-600 hover:text-blue-800">
          Sign in here
        </a>
      </p>
    </div>
  </div>
</div>
