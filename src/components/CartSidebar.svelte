<script lang="ts">
  import { onMount } from "svelte";
  import { CartController } from "$controllers/CartController";
  import type { CartWithItems } from "$models/Cart";

  export let isOpen = false;
  export let onClose: () => void;

  let cart: CartWithItems | null = null;
  let loading = true;
  let updating = false;

  onMount(async () => {
    await loadCart();
  });

  async function loadCart() {
    try {
      loading = true;
      cart = await CartController.getCurrentCart();
    } catch (err) {
      console.error("Error loading cart:", err);
    } finally {
      loading = false;
    }
  }

  async function updateQuantity(itemId: string, newQuantity: number) {
    if (newQuantity < 1) {
      await removeItem(itemId);
      return;
    }

    try {
      updating = true;
      await CartController.updateItemQuantity(itemId, newQuantity);
      await loadCart();
    } catch (err) {
      console.error("Error updating quantity:", err);
    } finally {
      updating = false;
    }
  }

  async function removeItem(itemId: string) {
    try {
      updating = true;
      await CartController.removeItem(itemId);
      await loadCart();
    } catch (err) {
      console.error("Error removing item:", err);
    } finally {
      updating = false;
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  function calculateSubtotal(): number {
    if (!cart?.items) return 0;
    return cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  function calculateItemCount(): number {
    if (!cart?.items) return 0;
    return cart.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  // Refresh cart when sidebar opens
  $: if (isOpen) {
    loadCart();
  }
</script>

<!-- Cart Sidebar -->
{#if isOpen}
  <div class="fixed inset-0 z-50 overflow-hidden">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" on:click={onClose}></div>
    
    <!-- Sidebar -->
    <div class="fixed inset-y-0 right-0 flex max-w-full pl-10">
      <div class="w-screen max-w-md">
        <div class="h-full flex flex-col bg-white shadow-xl">
          <!-- Header -->
          <div class="flex items-center justify-between px-4 py-6 border-b border-gray-200">
            <h2 class="text-lg font-medium text-gray-900">Shopping Cart</h2>
            <button
              on:click={onClose}
              class="text-gray-400 hover:text-gray-600"
            >
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <!-- Cart Content -->
          <div class="flex-1 overflow-y-auto px-4 py-6">
            {#if loading}
              <div class="text-center py-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p class="text-gray-600">Loading cart...</p>
              </div>
            {:else if !cart || cart.items.length === 0}
              <div class="text-center py-8">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m0 0h9.5m-9.5 0V9"></path>
                </svg>
                <h3 class="mt-2 text-sm font-medium text-gray-900">Your cart is empty</h3>
                <p class="mt-1 text-sm text-gray-500">Start adding some items to your cart.</p>
              </div>
            {:else}
              <div class="space-y-4">
                {#each cart.items as item}
                  <div class="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                    <!-- Product Image -->
                    <div class="flex-shrink-0">
                      {#if item.product?.featured_image}
                        <img
                          src={item.product.featured_image}
                          alt={item.product.name}
                          class="h-16 w-16 object-cover object-center rounded-md"
                        />
                      {:else}
                        <div class="h-16 w-16 bg-gray-200 rounded-md flex items-center justify-center">
                          <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                          </svg>
                        </div>
                      {/if}
                    </div>

                    <!-- Product Info -->
                    <div class="flex-1 min-w-0">
                      <h3 class="text-sm font-medium text-gray-900 truncate">
                        {item.product?.name || 'Product Name'}
                      </h3>
                      <p class="text-sm text-gray-500">
                        {formatCurrency(item.price)} × {item.quantity}
                      </p>
                      <p class="text-sm font-medium text-gray-900">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>

                    <!-- Quantity Controls -->
                    <div class="flex items-center space-x-1">
                      <button
                        type="button"
                        on:click={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={updating}
                        class="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
                        </svg>
                      </button>
                      
                      <span class="text-sm font-medium text-gray-900 w-6 text-center">
                        {item.quantity}
                      </span>
                      
                      <button
                        type="button"
                        on:click={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={updating}
                        class="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                      </button>
                    </div>

                    <!-- Remove Button -->
                    <button
                      type="button"
                      on:click={() => removeItem(item.id)}
                      disabled={updating}
                      class="text-red-400 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                    </button>
                  </div>
                {/each}
              </div>
            {/if}
          </div>

          <!-- Footer -->
          {#if cart && cart.items.length > 0}
            <div class="border-t border-gray-200 px-4 py-6">
              <div class="flex items-center justify-between mb-4">
                <span class="text-base font-medium text-gray-900">Subtotal</span>
                <span class="text-base font-medium text-gray-900">
                  {formatCurrency(calculateSubtotal())}
                </span>
              </div>
              
              <div class="space-y-3">
                <a
                  href="/cart"
                  class="w-full bg-indigo-600 text-white px-4 py-2 rounded-md font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 text-center block"
                >
                  View Cart ({calculateItemCount()})
                </a>
                
                <button
                  type="button"
                  class="w-full border border-gray-300 text-gray-700 px-4 py-2 rounded-md font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Checkout
                </button>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}
