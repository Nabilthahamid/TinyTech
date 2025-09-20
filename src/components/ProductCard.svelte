<script lang="ts">
  import { CartController } from "$controllers/CartController";
  import type { ProductWithCategory } from "$models/Product";

  export let product: ProductWithCategory;
  export let showAddToCart = true;
  export let showWishlist = true;
  export let compact = false;

  let addingToCart = false;
  let addingToWishlist = false;

  async function addToCart() {
    if (addingToCart) return;
    
    try {
      addingToCart = true;
      
      const cartItem = {
        product_id: product.id,
        quantity: 1,
        price: product.price,
      };
      
      await CartController.addItem(cartItem);
      
      // Dispatch event for cart sidebar to update
      const event = new CustomEvent('cartUpdated');
      window.dispatchEvent(event);
      
    } catch (err) {
      console.error("Error adding to cart:", err);
      alert("Failed to add product to cart. Please try again.");
    } finally {
      addingToCart = false;
    }
  }

  async function addToWishlist() {
    if (addingToWishlist) return;
    
    try {
      addingToWishlist = true;
      
      // This would need to be implemented in WishlistController
      // await WishlistController.addItem(product.id);
      
      alert("Product added to wishlist!");
      
    } catch (err) {
      console.error("Error adding to wishlist:", err);
      alert("Failed to add product to wishlist. Please try again.");
    } finally {
      addingToWishlist = false;
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  function calculateDiscount(): number {
    if (!product.compare_at_price || product.compare_at_price <= product.price) return 0;
    return Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100);
  }

  function getStockStatus() {
    if (!product.inventory) return { status: 'unknown', text: 'Unknown' };
    
    const available = product.inventory.available;
    if (available === 0) return { status: 'out_of_stock', text: 'Out of Stock' };
    if (available <= product.inventory.low_stock_threshold) return { status: 'low_stock', text: 'Low Stock' };
    return { status: 'in_stock', text: 'In Stock' };
  }

  const stockStatus = getStockStatus();
  const discount = calculateDiscount();
</script>

<div class="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 group">
  <a href="/product/{product.slug}" class="block">
    <!-- Product Image -->
    <div class="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-t-lg relative">
      {#if product.featured_image}
        <img
          src={product.featured_image}
          alt={product.name}
          class="h-48 w-full object-cover object-center group-hover:scale-105 transition-transform duration-200"
        />
      {:else}
        <div class="h-48 w-full bg-gray-200 flex items-center justify-center">
          <svg class="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
        </div>
      {/if}
      
      <!-- Discount Badge -->
      {#if discount > 0}
        <div class="absolute top-2 left-2">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            {discount}% OFF
          </span>
        </div>
      {/if}
      
      <!-- Stock Status -->
      <div class="absolute top-2 right-2">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {stockStatus.status === 'out_of_stock' ? 'bg-red-100 text-red-800' : stockStatus.status === 'low_stock' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}">
          {stockStatus.text}
        </span>
      </div>
      
      <!-- Wishlist Button -->
      {#if showWishlist}
        <button
          on:click|preventDefault|stopPropagation={addToWishlist}
          disabled={addingToWishlist}
          class="absolute top-2 right-2 {discount > 0 ? 'top-8' : ''} p-2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg class="h-4 w-4 text-gray-600 hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
          </svg>
        </button>
      {/if}
    </div>
    
    <!-- Product Info -->
    <div class="p-4">
      <!-- Category -->
      {#if product.category && !compact}
        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">
          {product.category.name}
        </p>
      {/if}
      
      <!-- Product Name -->
      <h3 class="text-sm font-medium text-gray-900 line-clamp-2 mb-2">
        {product.name}
      </h3>
      
      <!-- Brand -->
      {#if product.brand && !compact}
        <p class="text-xs text-gray-600 mb-2">{product.brand}</p>
      {/if}
      
      <!-- Price -->
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center space-x-2">
          <span class="text-lg font-semibold text-gray-900">
            {formatCurrency(product.price)}
          </span>
          {#if product.compare_at_price && product.compare_at_price > product.price}
            <span class="text-sm text-gray-500 line-through">
              {formatCurrency(product.compare_at_price)}
            </span>
          {/if}
        </div>
      </div>
      
      <!-- Rating (placeholder) -->
      {#if !compact}
        <div class="flex items-center mb-3">
          <div class="flex items-center">
            {#each Array(5) as _, i}
              <svg class="h-4 w-4 {i < 4 ? 'text-yellow-400' : 'text-gray-300'}" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
              </svg>
            {/each}
          </div>
          <span class="ml-2 text-xs text-gray-600">(4.0)</span>
        </div>
      {/if}
    </div>
  </a>
  
  <!-- Add to Cart Button -->
  {#if showAddToCart && stockStatus.status !== 'out_of_stock'}
    <div class="px-4 pb-4">
      <button
        on:click|preventDefault={addToCart}
        disabled={addingToCart || stockStatus.status === 'out_of_stock'}
        class="w-full bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
      >
        {addingToCart ? 'Adding...' : 'Add to Cart'}
      </button>
    </div>
  {/if}
</div>
