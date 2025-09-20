<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { ProductController } from "$controllers/ProductController";
  import { CartController } from "$controllers/CartController";
  import type { ProductWithCategory, ProductSpecification } from "$models/Product";
  import type { CartItem } from "$models/Cart";

  let product: ProductWithCategory | null = null;
  let relatedProducts: ProductWithCategory[] = [];
  let specifications: ProductSpecification[] = [];
  let loading = true;
  let error: string | null = null;
  let quantity = 1;
  let selectedImageIndex = 0;
  let addingToCart = false;
  let addingToWishlist = false;

  // Image gallery
  let showImageModal = false;
  let currentImageIndex = 0;

  $: productSlug = $page.params.slug;

  onMount(async () => {
    if (productSlug) {
      await loadProduct();
    }
  });

  async function loadProduct() {
    try {
      loading = true;
      
      // Load product details
      product = await ProductController.getProductWithSpecifications(productSlug);
      
      if (product) {
        // Load related products
        relatedProducts = await ProductController.getRelatedProducts(product.id, 4);
        
        // Load specifications
        specifications = product.specifications || [];
        
        // Track product view
        await ProductController.trackProductView(product.id);
      }
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to load product";
      console.error("Error loading product:", err);
    } finally {
      loading = false;
    }
  }

  async function addToCart() {
    if (!product || addingToCart) return;
    
    try {
      addingToCart = true;
      
      const cartItem: Omit<CartItem, "id" | "created_at" | "updated_at"> = {
        product_id: product.id,
        quantity,
        price: product.price,
      };
      
      await CartController.addItem(cartItem);
      
      // Show success message (you could use a toast notification here)
      alert("Product added to cart successfully!");
      
    } catch (err) {
      console.error("Error adding to cart:", err);
      alert("Failed to add product to cart. Please try again.");
    } finally {
      addingToCart = false;
    }
  }

  async function addToWishlist() {
    if (!product || addingToWishlist) return;
    
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
    if (!product || !product.compare_at_price) return 0;
    return Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100);
  }

  function openImageModal(index: number) {
    currentImageIndex = index;
    showImageModal = true;
  }

  function closeImageModal() {
    showImageModal = false;
  }

  function nextImage() {
    if (!product?.images) return;
    currentImageIndex = (currentImageIndex + 1) % product.images.length;
  }

  function prevImage() {
    if (!product?.images) return;
    currentImageIndex = currentImageIndex === 0 ? product.images.length - 1 : currentImageIndex - 1;
  }

  function incrementQuantity() {
    quantity += 1;
  }

  function decrementQuantity() {
    if (quantity > 1) {
      quantity -= 1;
    }
  }
</script>

<svelte:head>
  <title>{product?.name || 'Product'} - My MVC App</title>
  <meta name="description" content={product?.description || ''} />
</svelte:head>

<div class="min-h-screen bg-gray-50">
  {#if loading}
    <div class="text-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
      <p class="text-gray-600">Loading product...</p>
    </div>
  {:else if error || !product}
    <div class="text-center py-12">
      <div class="text-red-600 mb-4">
        <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <p class="text-lg font-medium">Product not found</p>
        <p class="text-sm text-gray-600">{error || 'The product you are looking for does not exist.'}</p>
      </div>
      <div class="mt-6">
        <a href="/catalog" class="btn btn-primary">
          Browse Products
        </a>
      </div>
    </div>
  {:else}
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Breadcrumb -->
      <nav class="mb-8">
        <ol class="flex items-center space-x-2 text-sm text-gray-500">
          <li><a href="/" class="hover:text-gray-700">Home</a></li>
          <li>/</li>
          <li><a href="/catalog" class="hover:text-gray-700">Catalog</a></li>
          {#if product.category}
            <li>/</li>
            <li><a href="/catalog?category={product.category.id}" class="hover:text-gray-700">{product.category.name}</a></li>
          {/if}
          <li>/</li>
          <li class="text-gray-900">{product.name}</li>
        </ol>
      </nav>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <!-- Product Images -->
        <div class="space-y-4">
          <!-- Main Image -->
          <div class="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-lg bg-gray-100">
            {#if product.images && product.images.length > 0}
              <img
                src={product.images[selectedImageIndex]}
                alt={product.name}
                class="h-96 w-full object-cover object-center cursor-pointer hover:opacity-90 transition-opacity"
                on:click={() => openImageModal(selectedImageIndex)}
              />
            {:else}
              <div class="h-96 w-full flex items-center justify-center">
                <svg class="h-24 w-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
              </div>
            {/if}
          </div>

          <!-- Thumbnail Images -->
          {#if product.images && product.images.length > 1}
            <div class="grid grid-cols-4 gap-2">
              {#each product.images as image, index}
                <button
                  on:click={() => selectedImageIndex = index}
                  class="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-md {selectedImageIndex === index ? 'ring-2 ring-indigo-500' : ''}"
                >
                  <img
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    class="h-20 w-full object-cover object-center hover:opacity-75"
                  />
                </button>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Product Info -->
        <div class="space-y-6">
          <!-- Title and Brand -->
          <div>
            <h1 class="text-3xl font-bold text-gray-900">{product.name}</h1>
            {#if product.brand}
              <p class="mt-2 text-lg text-gray-600">{product.brand}</p>
            {/if}
            {#if product.category}
              <p class="mt-1 text-sm text-gray-500">{product.category.name}</p>
            {/if}
          </div>

          <!-- Price -->
          <div class="flex items-center space-x-4">
            <span class="text-3xl font-bold text-gray-900">
              {formatCurrency(product.price)}
            </span>
            {#if product.compare_at_price && product.compare_at_price > product.price}
              <div class="flex items-center space-x-2">
                <span class="text-xl text-gray-500 line-through">
                  {formatCurrency(product.compare_at_price)}
                </span>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  {calculateDiscount()}% OFF
                </span>
              </div>
            {/if}
          </div>

          <!-- SKU -->
          {#if product.sku}
            <div class="text-sm text-gray-500">
              <span class="font-medium">SKU:</span> {product.sku}
            </div>
          {/if}

          <!-- Description -->
          {#if product.description}
            <div class="prose max-w-none">
              <p class="text-gray-700">{product.description}</p>
            </div>
          {/if}

          <!-- Quantity and Add to Cart -->
          <div class="space-y-4">
            <div class="flex items-center space-x-4">
              <label for="quantity" class="text-sm font-medium text-gray-700">Quantity:</label>
              <div class="flex items-center border border-gray-300 rounded-md">
                <button
                  type="button"
                  on:click={decrementQuantity}
                  class="px-3 py-2 text-gray-600 hover:text-gray-800 focus:outline-none"
                >
                  -
                </button>
                <input
                  type="number"
                  id="quantity"
                  bind:value={quantity}
                  min="1"
                  class="w-16 px-3 py-2 text-center border-0 focus:ring-0"
                />
                <button
                  type="button"
                  on:click={incrementQuantity}
                  class="px-3 py-2 text-gray-600 hover:text-gray-800 focus:outline-none"
                >
                  +
                </button>
              </div>
            </div>

            <div class="flex space-x-4">
              <button
                on:click={addToCart}
                disabled={addingToCart}
                class="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-md font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingToCart ? 'Adding...' : 'Add to Cart'}
              </button>
              
              <button
                on:click={addToWishlist}
                disabled={addingToWishlist}
                class="px-6 py-3 border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingToWishlist ? 'Adding...' : '♡ Wishlist'}
              </button>
            </div>
          </div>

          <!-- Product Features -->
          {#if product.tags && product.tags.length > 0}
            <div>
              <h3 class="text-sm font-medium text-gray-900 mb-2">Features:</h3>
              <div class="flex flex-wrap gap-2">
                {#each product.tags as tag}
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {tag}
                  </span>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      </div>

      <!-- Specifications -->
      {#if specifications.length > 0}
        <div class="mt-16">
          <h2 class="text-2xl font-bold text-gray-900 mb-6">Specifications</h2>
          <div class="bg-white rounded-lg shadow-sm overflow-hidden">
            <div class="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 class="text-lg font-medium text-gray-900">Technical Details</h3>
            </div>
            <dl class="divide-y divide-gray-200">
              {#each specifications as spec}
                <div class="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <dt class="text-sm font-medium text-gray-900">{spec.name}</dt>
                  <dd class="text-sm text-gray-700 md:col-span-2">{spec.value}</dd>
                </div>
              {/each}
            </dl>
          </div>
        </div>
      {/if}

      <!-- Related Products -->
      {#if relatedProducts.length > 0}
        <div class="mt-16">
          <h2 class="text-2xl font-bold text-gray-900 mb-6">Related Products</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {#each relatedProducts as relatedProduct}
              <div class="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                <a href="/product/{relatedProduct.slug}" class="block">
                  <div class="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-t-lg">
                    {#if relatedProduct.featured_image}
                      <img
                        src={relatedProduct.featured_image}
                        alt={relatedProduct.name}
                        class="h-48 w-full object-cover object-center"
                      />
                    {:else}
                      <div class="h-48 w-full bg-gray-200 flex items-center justify-center">
                        <svg class="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                      </div>
                    {/if}
                  </div>
                  
                  <div class="p-4">
                    <h3 class="text-sm font-medium text-gray-900 line-clamp-2">
                      {relatedProduct.name}
                    </h3>
                    
                    <div class="mt-2 flex items-center justify-between">
                      <span class="text-lg font-semibold text-gray-900">
                        {formatCurrency(relatedProduct.price)}
                      </span>
                    </div>
                  </div>
                </a>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- Image Modal -->
{#if showImageModal && product?.images}
  <div class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" on:click={closeImageModal}></div>
      
      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="relative">
            <button
              on:click={closeImageModal}
              class="absolute top-0 right-0 -mt-2 -mr-2 text-gray-400 hover:text-gray-600"
            >
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
            
            <img
              src={product.images[currentImageIndex]}
              alt={product.name}
              class="w-full h-96 object-cover"
            />
            
            {#if product.images.length > 1}
              <button
                on:click={prevImage}
                class="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75"
              >
                <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                </svg>
              </button>
              
              <button
                on:click={nextImage}
                class="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75"
              >
                <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </button>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
