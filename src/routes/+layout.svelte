<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { UserController } from '$controllers/UserController';
  import Navigation from '$components/Navigation.svelte';

  onMount(async () => {
    // Initialize user session on app load
    await UserController.getCurrentUser();
  });
</script>

<svelte:head>
  <title>My MVC App</title>
  <meta name="description" content="A Svelte MVC application with Supabase" />
</svelte:head>

<Navigation />
<main class="container mx-auto px-4 py-8">
  <slot />
</main>

<footer class="bg-gray-100 py-8 mt-16">
  <div class="container mx-auto px-4 text-center text-gray-600">
    <p>&copy; 2024 My MVC App. Built with Svelte and Supabase.</p>
  </div>
</footer>
