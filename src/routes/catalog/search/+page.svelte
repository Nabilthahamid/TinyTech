<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { ProductController } from "$controllers/ProductController";
  import { CategoryController } from "$controllers/CategoryController";
  import ProductCard from "$components/ProductCard.svelte";
  import type { ProductWithCategory } from "$models/Product";
  import type { CategoryTree } from "$models/Category";

  let products: ProductWithCategory[] = [];
  let categories: CategoryTree[] = [];
  let brands: string[] = [];
  let loading = true;
  let error: string | null = null;

  // Search and filter state from URL params
  let searchQuery = "";
  let selectedCategory = "";
  let selectedBrand = "";
  let minPrice = "";
  let maxPrice = "";
  let minRating = "";
  let inStock = false;
  let sortBy = "newest";
  let currentPage = 1;
  let totalResults = 0;
  let resultsPerPage = 20;

  // Filter options
  const sortOptions = [
    { value: "newest", label: "Newest First" },
    { value: "price_low", label: "Price: Low to High" },
    { value: "price_high", label: "Price: High to Low" },
    { value: "rating", label: "Highest Rated" },
    { value: "popularity", label: "Most Popular" },
  ];

  const ratingOptions = [
    { value: "", label: "Any Rating" },
    { value: "4", label: "4+ Stars" },
    { value: "3", label: "3+ Stars" },
    { value: "2", label: "2+ Stars" },
    { value: "1", label: "1+ Stars" },
  ];

  onMount(async () => {
    await initializeFromURL();
    await loadInitialData();
  });

  async function initializeFromURL() {
    const params = $page.url.searchParams;
    
    searchQuery = params.get("q") || "";
    selectedCategory = params.get("category") || "";
    selectedBrand = params.get("brand") || "";
    minPrice = params.get("min_price") || "";
    maxPrice = params.get("max_price") || "";
    minRating = params.get("min_rating") || "";
    inStock = params.get("in_stock") === "true";
    sortBy = params.get("sort") || "newest";
    currentPage = parseInt(params.get("page") || "1");
  }

  async function loadInitialData() {
    try {
      loading = true;
      
      // Load categories and brands in parallel
      const [categoriesData, brandsData] = await Promise.all([
        CategoryController.getCategoryTree(),
        ProductController.getAllBrands(),
      ]);
      
      categories = categoriesData;
      brands = brandsData;
      
      // Perform search
      await performSearch();
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to load search results";
      console.error("Error loading search data:", err);
    } finally {
      loading = false;
    }
  }

  async function performSearch() {
    try {
      const filters = {
        query: searchQuery || undefined,
        categoryId: selectedCategory || undefined,
        brand: selectedBrand || undefined,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        minRating: minRating ? parseFloat(minRating) : undefined,
        inStock: inStock || undefined,
        sortBy: sortBy as any,
        page: currentPage,
        limit: resultsPerPage,
      };

      products = await ProductController.advancedSearch(filters);
      totalResults = products.length; // This would be improved with actual total count from API
      
      // Update URL without page reload
      updateURL();
    } catch (err) {
      console.error("Error performing search:", err);
      throw err;
    }
  }

  function updateURL() {
    const params = new URLSearchParams();
    
    if (searchQuery) params.set("q", searchQuery);
    if (selectedCategory) params.set("category", selectedCategory);
    if (selectedBrand) params.set("brand", selectedBrand);
    if (minPrice) params.set("min_price", minPrice);
    if (maxPrice) params.set("max_price", maxPrice);
    if (minRating) params.set("min_rating", minRating);
    if (inStock) params.set("in_stock", "true");
    if (sortBy !== "newest") params.set("sort", sortBy);
    if (currentPage > 1) params.set("page", currentPage.toString());

    const newUrl = `/catalog/search?${params.toString()}`;
    window.history.replaceState({}, "", newUrl);
  }

  async function handleSearch() {
    currentPage = 1;
    await performSearch();
  }

  async function handleFilterChange() {
    currentPage = 1;
    await performSearch();
  }

  async function handleSortChange() {
    await performSearch();
  }

  async function handlePageChange(page: number) {
    currentPage = page;
    await performSearch();
  }

  function clearFilters() {
    searchQuery = "";
    selectedCategory = "";
    selectedBrand = "";
    minPrice = "";
    maxPrice = "";
    minRating = "";
    inStock = false;
    sortBy = "newest";
    handleFilterChange();
  }

  function getSearchTitle(): string {
    if (searchQuery) {
      return `Search results for "${searchQuery}"`;
    }
    if (selectedCategory) {
      const category = categories.find(c => c.id === selectedCategory);
      return category ? `Products in ${category.name}` : "Products";
    }
    if (selectedBrand) {
      return `${selectedBrand} Products`;
    }
    return "All Products";
  }

  function getTotalPages(): number {
    return Math.ceil(totalResults / resultsPerPage);
  }
</script>

<svelte:head>
  <title>{getSearchTitle()} - TinyTech</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <!-- Header -->
  <div class="bg-white shadow-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="py-6">
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div class="mb-4 lg:mb-0">
            <h1 class="text-3xl font-bold text-gray-900">{getSearchTitle()}</h1>
            <p class="mt-2 text-gray-600">
              {totalResults > 0 ? `${totalResults} products found` : "No products found"}
            </p>
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
        <div class="bg-white rounded-lg shadow-sm p-6 sticky top-8">
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
            <div class="space-y-2 max-h-48 overflow-y-auto">
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
              {#each brands as brand}
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
                  bind:value={minPrice}
                  on:change={handleFilterChange}
                  placeholder="Min"
                  min="0"
                  step="0.01"
                  class="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                />
                <span class="text-gray-500">to</span>
                <input
                  type="number"
                  bind:value={maxPrice}
                  on:change={handleFilterChange}
                  placeholder="Max"
                  min="0"
                  step="0.01"
                  class="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <!-- Rating -->
          <div class="mb-6">
            <h3 class="text-sm font-medium text-gray-900 mb-3">Minimum Rating</h3>
            <div class="space-y-2">
              {#each ratingOptions as option}
                <label class="flex items-center">
                  <input
                    type="radio"
                    bind:group={minRating}
                    value={option.value}
                    on:change={handleFilterChange}
                    class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <span class="ml-2 text-sm text-gray-700">{option.label}</span>
                </label>
              {/each}
            </div>
          </div>

          <!-- Availability -->
          <div class="mb-6">
            <h3 class="text-sm font-medium text-gray-900 mb-3">Availability</h3>
            <label class="flex items-center">
              <input
                type="checkbox"
                bind:checked={inStock}
                on:change={handleFilterChange}
                class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span class="ml-2 text-sm text-gray-700">In Stock Only</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Results -->
      <div class="flex-1">
        <!-- Sort and Results Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div class="mb-4 sm:mb-0">
            <p class="text-sm text-gray-700">
              Showing {products.length} of {totalResults} products
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
            <p class="text-gray-600">Searching products...</p>
          </div>
        {:else if error}
          <div class="text-center py-12">
            <div class="text-red-600 mb-4">
              <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <p class="text-lg font-medium">Error loading search results</p>
              <p class="text-sm text-gray-600">{error}</p>
            </div>
          </div>
        {:else if products.length === 0}
          <div class="text-center py-12">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
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
              <ProductCard {product} />
            {/each}
          </div>

          <!-- Pagination -->
          {#if getTotalPages() > 1}
            <div class="mt-8 flex items-center justify-center">
              <nav class="flex items-center space-x-2">
                <button
                  on:click={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                {#each Array(getTotalPages()) as _, page}
                  <button
                    on:click={() => handlePageChange(page + 1)}
                    class="px-3 py-2 text-sm font-medium {page + 1 === currentPage ? 'text-indigo-600 bg-indigo-50 border-indigo-500' : 'text-gray-500 bg-white border-gray-300'} border rounded-md hover:bg-gray-50"
                  >
                    {page + 1}
                  </button>
                {/each}
                
                <button
                  on:click={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === getTotalPages()}
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
