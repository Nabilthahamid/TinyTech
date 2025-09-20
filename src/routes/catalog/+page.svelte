<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { ProductController } from "$controllers/ProductController";
  import { CategoryController } from "$controllers/CategoryController";
  import type { ProductWithCategory } from "$models/Product";
  import type { CategoryTree } from "$models/Category";

  let products: ProductWithCategory[] = [];
  let categories: CategoryTree[] = [];
  let brands: string[] = [];
  let loading = true;
  let error: string | null = null;

  // Search and filter state
  let searchQuery = "";
  let selectedCategory = "";
  let selectedBrand = "";
  let priceRange = { min: 0, max: 1000 };
  let sortBy = "newest";
  let showFilters = false;
  let currentPage = 1;
  let totalPages = 1;

  // Filter options
  const sortOptions = [
    { value: "newest", label: "Newest First" },
    { value: "price_low", label: "Price: Low to High" },
    { value: "price_high", label: "Price: High to Low" },
    { value: "rating", label: "Highest Rated" },
  ];

  onMount(async () => {
    try {
      // Load initial data
      await Promise.all([
        loadProducts(),
        loadCategories(),
        loadBrands(),
      ]);
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to load catalog";
    } finally {
      loading = false;
    }
  });

  async function loadProducts() {
    try {
      const filters = {
        query: searchQuery || undefined,
        categoryId: selectedCategory || undefined,
        brand: selectedBrand || undefined,
        minPrice: priceRange.min || undefined,
        maxPrice: priceRange.max || undefined,
        sortBy: sortBy as any,
        page: currentPage,
        limit: 20,
      };

      products = await ProductController.advancedSearch(filters);
    } catch (err) {
      console.error("Error loading products:", err);
      throw err;
    }
  }

  async function loadCategories() {
    try {
      categories = await CategoryController.getCategoryTree();
    } catch (err) {
      console.error("Error loading categories:", err);
    }
  }

  async function loadBrands() {
    try {
      brands = await ProductController.getAllBrands();
    } catch (err) {
      console.error("Error loading brands:", err);
    }
  }

  async function handleSearch() {
    if (searchQuery.trim()) {
      window.location.href = `/catalog/search?q=${encodeURIComponent(searchQuery.trim())}`;
    } else {
      currentPage = 1;
      await loadProducts();
    }
  }

  async function handleFilterChange() {
    currentPage = 1;
    await loadProducts();
  }

  async function handleSortChange() {
    await loadProducts();
  }

  async function handlePageChange(page: number) {
    currentPage = page;
    await loadProducts();
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  function clearFilters() {
    searchQuery = "";
    selectedCategory = "";
    selectedBrand = "";
    priceRange = { min: 0, max: 1000 };
    sortBy = "newest";
    handleFilterChange();
  }
</script>

<svelte:head>
  <title>Product Catalog - My MVC App</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <!-- Header -->
  <div class="bg-white shadow-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="py-6">
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div class="mb-4 lg:mb-0">
            <h1 class="text-3xl font-bold text-gray-900">Product Catalog</h1>
            <p class="mt-2 text-gray-600">Discover our amazing products</p>
          </div>
          
          <!-- Search Bar -->
          <div class="flex-1 max-w-md">
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
              <input
                type="text"
                bind:value={searchQuery}
                on:input={handleSearch}
                class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Search products..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="flex flex-col lg:flex-row gap-8">
      <!-- Filters Sidebar -->
      <div class="lg:w-64 flex-shrink-0">
        <div class="bg-white rounded-lg shadow-sm p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-medium text-gray-900">Filters</h2>
            <button
              on:click={clearFilters}
              class="text-sm text-indigo-600 hover:text-indigo-500"
            >
              Clear all
            </button>
          </div>

          <!-- Categories -->
          <div class="mb-6">
            <h3 class="text-sm font-medium text-gray-900 mb-3">Categories</h3>
            <div class="space-y-2">
              <label class="flex items-center">
                <input
                  type="radio"
                  bind:group={selectedCategory}
                  value=""
                  on:change={handleFilterChange}
                  class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                />
                <span class="ml-2 text-sm text-gray-700">All Categories</span>
              </label>
              {#each categories as category}
                <label class="flex items-center">
                  <input
                    type="radio"
                    bind:group={selectedCategory}
                    value={category.id}
                    on:change={handleFilterChange}
                    class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <span class="ml-2 text-sm text-gray-700">{category.name}</span>
                </label>
              {/each}
            </div>
          </div>

          <!-- Brands -->
          <div class="mb-6">
            <h3 class="text-sm font-medium text-gray-900 mb-3">Brands</h3>
            <div class="space-y-2">
              <label class="flex items-center">
                <input
                  type="radio"
                  bind:group={selectedBrand}
                  value=""
                  on:change={handleFilterChange}
                  class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                />
                <span class="ml-2 text-sm text-gray-700">All Brands</span>
              </label>
              {#each brands.slice(0, 10) as brand}
                <label class="flex items-center">
                  <input
                    type="radio"
                    bind:group={selectedBrand}
                    value={brand}
                    on:change={handleFilterChange}
                    class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <span class="ml-2 text-sm text-gray-700">{brand}</span>
                </label>
              {/each}
            </div>
          </div>

          <!-- Price Range -->
          <div class="mb-6">
            <h3 class="text-sm font-medium text-gray-900 mb-3">Price Range</h3>
            <div class="space-y-3">
              <div class="flex items-center space-x-2">
                <input
                  type="number"
                  bind:value={priceRange.min}
                  on:change={handleFilterChange}
                  placeholder="Min"
                  class="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                />
                <span class="text-gray-500">to</span>
                <input
                  type="number"
                  bind:value={priceRange.max}
                  on:change={handleFilterChange}
                  placeholder="Max"
                  class="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Products Grid -->
      <div class="flex-1">
        <!-- Sort and Results Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div class="mb-4 sm:mb-0">
            <p class="text-sm text-gray-700">
              Showing {products.length} products
            </p>
          </div>
          
          <div class="flex items-center space-x-4">
            <label for="sort" class="text-sm font-medium text-gray-700">Sort by:</label>
            <select
              id="sort"
              bind:value={sortBy}
              on:change={handleSortChange}
              class="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              {#each sortOptions as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
          </div>
        </div>

        {#if loading}
          <div class="text-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p class="text-gray-600">Loading products...</p>
          </div>
        {:else if error}
          <div class="text-center py-12">
            <div class="text-red-600 mb-4">
              <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <p class="text-lg font-medium">Error loading products</p>
              <p class="text-sm text-gray-600">{error}</p>
            </div>
          </div>
        {:else if products.length === 0}
          <div class="text-center py-12">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">No products found</h3>
            <p class="mt-1 text-sm text-gray-500">Try adjusting your search or filter criteria.</p>
            <div class="mt-6">
              <button
                on:click={clearFilters}
                class="btn btn-primary"
              >
                Clear Filters
              </button>
            </div>
          </div>
        {:else}
          <!-- Products Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {#each products as product}
              <div class="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                <a href="/product/{product.slug}" class="block">
                  <div class="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-t-lg">
                    {#if product.featured_image}
                      <img
                        src={product.featured_image}
                        alt={product.name}
                        class="h-48 w-full object-cover object-center group-hover:opacity-75"
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
                      {product.name}
                    </h3>
                    
                    {#if product.category}
                      <p class="mt-1 text-xs text-gray-500">{product.category.name}</p>
                    {/if}
                    
                    <div class="mt-2 flex items-center justify-between">
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
                    
                    {#if product.brand}
                      <p class="mt-1 text-xs text-gray-500">{product.brand}</p>
                    {/if}
                  </div>
                </a>
              </div>
            {/each}
          </div>

          <!-- Pagination -->
          {#if totalPages > 1}
            <div class="mt-8 flex items-center justify-center">
              <nav class="flex items-center space-x-2">
                <button
                  on:click={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                {#each Array(totalPages) as _, page}
                  <button
                    on:click={() => handlePageChange(page + 1)}
                    class="px-3 py-2 text-sm font-medium {page + 1 === currentPage ? 'text-indigo-600 bg-indigo-50 border-indigo-500' : 'text-gray-500 bg-white border-gray-300'} border rounded-md hover:bg-gray-50"
                  >
                    {page + 1}
                  </button>
                {/each}
                
                <button
                  on:click={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          {/if}
        {/if}
      </div>
    </div>
  </div>
</div>
