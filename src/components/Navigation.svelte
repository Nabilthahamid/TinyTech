<script lang="ts">
  import { onMount } from "svelte";
  import { currentUser } from '$controllers/UserController';
  import { UserController } from '$controllers/UserController';
  import { CartController } from '$controllers/CartController';
  import { page } from '$app/stores';
  import SearchBar from './SearchBar.svelte';
  import CartSidebar from './CartSidebar.svelte';
  import type { ProductWithCategory } from '$models/Product';

  let showMobileMenu = false;
  let showCartSidebar = false;
  let cartItemCount = 0;

  async function handleSignOut() {
    try {
      await UserController.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  function toggleMobileMenu() {
    showMobileMenu = !showMobileMenu;
  }

  function toggleCartSidebar() {
    showCartSidebar = !showCartSidebar;
  }

  function closeCartSidebar() {
    showCartSidebar = false;
  }

  async function loadCartCount() {
    try {
      const cart = await CartController.getCurrentCart();
      cartItemCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    } catch (err) {
      console.error('Error loading cart count:', err);
    }
  }

  function handleProductSelect(product: ProductWithCategory) {
    window.location.href = `/product/${product.slug}`;
  }

  function handleCartUpdated() {
    loadCartCount();
  }

  onMount(() => {
    loadCartCount();
    
    // Listen for cart updates
    window.addEventListener('cartUpdated', handleCartUpdated);
    
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdated);
    };
  });
</script>

<nav class="bg-white shadow-lg">
  <div class="container mx-auto px-4">
    <div class="flex justify-between items-center py-4">
      <!-- Logo -->
      <div class="flex items-center">
        <a href="/" class="text-xl font-bold text-gray-900">
          My MVC App
        </a>
      </div>

      <!-- Search Bar -->
      <div class="hidden md:block flex-1 max-w-md mx-8">
        <SearchBar onSelect={handleProductSelect} />
      </div>

      <!-- Desktop Navigation -->
      <div class="hidden md:flex items-center space-x-6">
        <a href="/" class="text-gray-700 hover:text-indigo-600 transition-colors">
          Home
        </a>
        <a href="/catalog" class="text-gray-700 hover:text-indigo-600 transition-colors">
          Catalog
        </a>
        <a href="/posts" class="text-gray-700 hover:text-indigo-600 transition-colors">
          Posts
        </a>
        
        <!-- Cart Button -->
        <button
          on:click={toggleCartSidebar}
          class="relative p-2 text-gray-700 hover:text-indigo-600 transition-colors"
        >
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m0 0h9.5m-9.5 0V9"></path>
          </svg>
          {#if cartItemCount > 0}
            <span class="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {cartItemCount > 99 ? '99+' : cartItemCount}
            </span>
          {/if}
        </button>
        
        {#if $currentUser}
          <a href="/posts/create" class="text-gray-700 hover:text-indigo-600 transition-colors">
            Create Post
          </a>
          {#if $currentUser.role === 'admin'}
            <a href="/admin" class="text-gray-700 hover:text-indigo-600 transition-colors">
              Admin
            </a>
          {/if}
          <div class="flex items-center space-x-4">
            <span class="text-gray-700">Hello, {$currentUser.email}</span>
            <button 
              on:click={handleSignOut}
              class="btn btn-secondary"
            >
              Sign Out
            </button>
          </div>
        {:else}
          <a href="/auth/signin" class="text-gray-700 hover:text-indigo-600 transition-colors">
            Sign In
          </a>
          <a href="/auth/signup" class="btn btn-primary">
            Sign Up
          </a>
        {/if}
      </div>

      <!-- Mobile menu button -->
      <div class="md:hidden">
        <button 
          on:click={toggleMobileMenu}
          class="text-gray-700 hover:text-blue-600 focus:outline-none"
        >
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Mobile Navigation -->
    {#if showMobileMenu}
      <div class="md:hidden py-4 border-t">
        <!-- Mobile Search -->
        <div class="mb-4">
          <SearchBar onSelect={handleProductSelect} />
        </div>
        
        <div class="flex flex-col space-y-4">
          <a href="/" class="text-gray-700 hover:text-indigo-600 transition-colors">
            Home
          </a>
          <a href="/catalog" class="text-gray-700 hover:text-indigo-600 transition-colors">
            Catalog
          </a>
          <a href="/posts" class="text-gray-700 hover:text-indigo-600 transition-colors">
            Posts
          </a>
          
          <!-- Mobile Cart Button -->
          <button
            on:click={toggleCartSidebar}
            class="flex items-center space-x-2 text-gray-700 hover:text-indigo-600 transition-colors"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m0 0h9.5m-9.5 0V9"></path>
            </svg>
            <span>Cart</span>
            {#if cartItemCount > 0}
              <span class="bg-indigo-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {cartItemCount > 99 ? '99+' : cartItemCount}
              </span>
            {/if}
          </button>
          
          {#if $currentUser}
            <a href="/posts/create" class="text-gray-700 hover:text-indigo-600 transition-colors">
              Create Post
            </a>
            {#if $currentUser.role === 'admin'}
              <a href="/admin" class="text-gray-700 hover:text-indigo-600 transition-colors">
                Admin
              </a>
            {/if}
            <div class="pt-4 border-t">
              <p class="text-gray-700 mb-2">Signed in as {$currentUser.email}</p>
              <button 
                on:click={handleSignOut}
                class="btn btn-secondary w-full"
              >
                Sign Out
              </button>
            </div>
          {:else}
            <a href="/auth/signin" class="text-gray-700 hover:text-indigo-600 transition-colors">
              Sign In
            </a>
            <a href="/auth/signup" class="btn btn-primary w-full">
              Sign Up
            </a>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</nav>

<!-- Cart Sidebar -->
<CartSidebar bind:isOpen={showCartSidebar} onClose={closeCartSidebar} />
