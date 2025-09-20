<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { AdminController } from "$controllers/AdminController";
  import { goto } from "$app/navigation";
  import AdminSidebar from "$components/admin/AdminSidebar.svelte";
  import AdminHeader from "$components/admin/AdminHeader.svelte";

  let isAdmin = false;
  let loading = true;

  onMount(async () => {
    try {
      isAdmin = await AdminController.checkAdminRole();
      if (!isAdmin) {
        goto("/");
      }
    } catch (error) {
      console.error("Error checking admin role:", error);
      goto("/");
    } finally {
      loading = false;
    }
  });
</script>

<svelte:head>
  <title>Admin Dashboard - My MVC App</title>
</svelte:head>

{#if loading}
  <div class="min-h-screen bg-gray-100 flex items-center justify-center">
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p class="text-gray-600">Loading admin dashboard...</p>
    </div>
  </div>
{:else if !isAdmin}
  <div class="min-h-screen bg-gray-100 flex items-center justify-center">
    <div class="text-center">
      <h1 class="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
      <p class="text-gray-600 mb-6">You don't have permission to access the admin dashboard.</p>
      <a href="/" class="btn btn-primary">Go Home</a>
    </div>
  </div>
{:else}
  <div class="min-h-screen bg-gray-100">
    <AdminSidebar />
    
    <div class="lg:pl-64">
      <AdminHeader />
      
      <main class="py-6">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <slot />
        </div>
      </main>
    </div>
  </div>
{/if}
