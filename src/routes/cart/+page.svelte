<script lang="ts">
  import { onMount } from "svelte";
  import { CartController } from "$controllers/CartController";
  import type { CartWithItems } from "$models/Cart";

  let cart: CartWithItems | null = null;
  let loading = true;
  let error: string | null = null;
  let updating = false;

  onMount(async () => {
    await loadCart();
  });

  async function loadCart() {
    try {
      loading = true;
      cart = await CartController.getCurrentCart();
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to load cart";
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
      await loadCart(); // Reload to get updated totals
    } catch (err) {
      console.error("Error updating quantity:", err);
      alert("Failed to update quantity. Please try again.");
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
      alert("Failed to remove item. Please try again.");
    } finally {
      updating = false;
    }
  }

  async function clearCart() {
    if (!confirm("Are you sure you want to clear your cart?")) {
      return;
    }

    try {
      updating = true;
      await CartController.clearCart();
      await loadCart();
    } catch (err) {
      console.error("Error clearing cart:", err);
      alert("Failed to clear cart. Please try again.");
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

  function calculateTax(subtotal: number): number {
    // Simple 8% tax calculation - you might want to make this configurable
    return subtotal * 0.08;
  }

  function calculateShipping(subtotal: number): number {
    // Free shipping over $50, otherwise $5.99
    return subtotal >= 50 ? 0 : 5.99;
  }

  function calculateTotal(): number {
    const subtotal = calculateSubtotal();
    const tax = calculateTax(subtotal);
    const shipping = calculateShipping(subtotal);
    return subtotal + tax + shipping;
  }
</script>

<svelte:head>
  <title>Shopping Cart - My MVC App</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Shopping Cart</h1>
      <p class="mt-2 text-gray-600">Review your items before checkout</p>
    </div>

    {#if loading}
      <div class="text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p class="text-gray-600">Loading cart...</p>
      </div>
    {:else if error}
      <div class="text-center py-12">
        <div class="text-red-600 mb-4">
          <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="text-lg font-medium">Error loading cart</p>
          <p class="text-sm text-gray-600">{error}</p>
        </div>
        <div class="mt-6">
          <button on:click={loadCart} class="btn btn-primary">
            Try Again
          </button>
        </div>
      </div>
    {:else if !cart || cart.items.length === 0}
      <div class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m0 0h9.5m-9.5 0V9"></path>
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">Your cart is empty</h3>
        <p class="mt-1 text-sm text-gray-500">Start adding some items to your cart.</p>
        <div class="mt-6">
          <a href="/catalog" class="btn btn-primary">
            Browse Products
          </a>
        </div>
      </div>
    {:else}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Cart Items -->
        <div class="lg:col-span-2">
          <div class="bg-white rounded-lg shadow-sm">
            <div class="px-6 py-4 border-b border-gray-200">
              <div class="flex items-center justify-between">
                <h2 class="text-lg font-medium text-gray-900">
                  Cart Items ({cart.items.length})
                </h2>
                <button
                  on:click={clearCart}
                  disabled={updating}
                  class="text-sm text-red-600 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear Cart
                </button>
              </div>
            </div>

            <div class="divide-y divide-gray-200">
              {#each cart.items as item}
                <div class="px-6 py-4">
                  <div class="flex items-center space-x-4">
                    <!-- Product Image -->
                    <div class="flex-shrink-0">
                      {#if item.product?.featured_image}
                        <img
                          src={item.product.featured_image}
                          alt={item.product.name}
                          class="h-20 w-20 object-cover object-center rounded-md"
                        />
                      {:else}
                        <div class="h-20 w-20 bg-gray-200 rounded-md flex items-center justify-center">
                          <svg class="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      {#if item.product?.brand}
                        <p class="text-sm text-gray-500">{item.product.brand}</p>
                      {/if}
                      <p class="text-sm text-gray-500">
                        {formatCurrency(item.price)} each
                      </p>
                    </div>

                    <!-- Quantity Controls -->
                    <div class="flex items-center space-x-2">
                      <button
                        type="button"
                        on:click={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={updating}
                        class="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
                        </svg>
                      </button>
                      
                      <span class="text-sm font-medium text-gray-900 w-8 text-center">
                        {item.quantity}
                      </span>
                      
                      <button
                        type="button"
                        on:click={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={updating}
                        class="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                      </button>
                    </div>

                    <!-- Price -->
                    <div class="text-right">
                      <p class="text-sm font-medium text-gray-900">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>

                    <!-- Remove Button -->
                    <button
                      type="button"
                      on:click={() => removeItem(item.id)}
                      disabled={updating}
                      class="text-red-400 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </div>

        <!-- Order Summary -->
        <div class="lg:col-span-1">
          <div class="bg-white rounded-lg shadow-sm p-6 sticky top-8">
            <h2 class="text-lg font-medium text-gray-900 mb-4">Order Summary</h2>
            
            <div class="space-y-3">
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Subtotal</span>
                <span class="text-gray-900">{formatCurrency(calculateSubtotal())}</span>
              </div>
              
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Shipping</span>
                <span class="text-gray-900">
                  {calculateShipping(calculateSubtotal()) === 0 ? 'Free' : formatCurrency(calculateShipping(calculateSubtotal()))}
                </span>
              </div>
              
              <div class="flex justify-between text-sm">
                <span class="text-gray-600">Tax</span>
                <span class="text-gray-900">{formatCurrency(calculateTax(calculateSubtotal()))}</span>
              </div>
              
              <div class="border-t border-gray-200 pt-3">
                <div class="flex justify-between">
                  <span class="text-base font-medium text-gray-900">Total</span>
                  <span class="text-base font-medium text-gray-900">{formatCurrency(calculateTotal())}</span>
                </div>
              </div>
            </div>

            <div class="mt-6 space-y-3">
              <button
                type="button"
                class="w-full bg-indigo-600 text-white px-4 py-2 rounded-md font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Proceed to Checkout
              </button>
              
              <a
                href="/catalog"
                class="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Continue Shopping
              </a>
            </div>

            <!-- Shipping Info -->
            {#if calculateShipping(calculateSubtotal()) > 0}
              <div class="mt-4 p-3 bg-blue-50 rounded-md">
                <p class="text-sm text-blue-800">
                  <span class="font-medium">Free shipping</span> on orders over $50!
                  <span class="block text-xs mt-1">
                    Add {formatCurrency(50 - calculateSubtotal())} more to qualify.
                  </span>
                </p>
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>
