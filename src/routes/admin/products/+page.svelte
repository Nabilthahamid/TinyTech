<script lang="ts">
  import { onMount } from "svelte";
  import { ProductController } from "$controllers/ProductController";
  import type { ProductWithCategory } from "$models/Product";

  let products: ProductWithCategory[] = [];
  let loading = true;
  let error: string | null = null;
  let searchQuery = "";
  let filteredProducts: ProductWithCategory[] = [];

  onMount(async () => {
    try {
      products = await ProductController.getAllProducts();
      filteredProducts = products;
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to load products";
    } finally {
      loading = false;
    }
  });

  function handleSearch() {
    if (!searchQuery.trim()) {
      filteredProducts = products;
    } else {
      filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category?.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
</script>

<svelte:head>
  <title>Products - Admin</title>
</svelte:head>

<div class="space-y-6">
  <!-- Page header -->
  <div class="flex justify-between items-center">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Products</h1>
      <p class="mt-1 text-sm text-gray-500">
        Manage your product catalog
      </p>
    </div>
    <a href="/admin/products/create" class="btn btn-primary">
      Add Product
    </a>
  </div>

  <!-- Search and filters -->
  <div class="bg-white shadow rounded-lg p-6">
    <div class="flex flex-col sm:flex-row gap-4">
      <div class="flex-1">
        <label for="search" class="sr-only">Search products</label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
          <input
            id="search"
            type="text"
            bind:value={searchQuery}
            on:input={handleSearch}
            class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Search products..."
          />
        </div>
      </div>
      <div class="flex gap-2">
        <select class="border border-gray-300 rounded-md px-3 py-2 text-sm">
          <option>All Categories</option>
        </select>
        <select class="border border-gray-300 rounded-md px-3 py-2 text-sm">
          <option>All Status</option>
          <option>Active</option>
          <option>Inactive</option>
          <option>Draft</option>
        </select>
      </div>
    </div>
  </div>

  {#if loading}
    <div class="text-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
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
  {:else}
    <!-- Products table -->
    <div class="bg-white shadow overflow-hidden sm:rounded-md">
      <ul class="divide-y divide-gray-200">
        {#each filteredProducts as product}
          <li>
            <div class="px-4 py-4 flex items-center justify-between hover:bg-gray-50">
              <div class="flex items-center">
                <div class="flex-shrink-0 h-16 w-16">
                  {#if product.featured_image}
                    <img class="h-16 w-16 rounded-lg object-cover" src={product.featured_image} alt={product.name} />
                  {:else}
                    <div class="h-16 w-16 rounded-lg bg-gray-200 flex items-center justify-center">
                      <svg class="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                    </div>
                  {/if}
                </div>
                <div class="ml-4 flex-1">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-sm font-medium text-indigo-600 truncate">
                        <a href="/admin/products/{product.id}">{product.name}</a>
                      </p>
                      <p class="text-sm text-gray-500">SKU: {product.sku}</p>
                      {#if product.category}
                        <p class="text-sm text-gray-500">Category: {product.category.name}</p>
                      {/if}
                    </div>
                    <div class="flex items-center space-x-4">
                      <div class="text-right">
                        <p class="text-sm font-medium text-gray-900">{formatCurrency(product.price)}</p>
                        {#if product.compare_at_price}
                          <p class="text-sm text-gray-500 line-through">{formatCurrency(product.compare_at_price)}</p>
                        {/if}
                      </div>
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getStatusColor(product.status)}">
                        {product.status}
                      </span>
                      {#if product.featured}
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Featured
                        </span>
                      {/if}
                    </div>
                  </div>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <a href="/admin/products/{product.id}/edit" class="text-indigo-600 hover:text-indigo-900 text-sm font-medium">
                  Edit
                </a>
                <button class="text-red-600 hover:text-red-900 text-sm font-medium">
                  Delete
                </button>
              </div>
            </div>
          </li>
        {/each}
      </ul>

      {#if filteredProducts.length === 0}
        <div class="text-center py-12">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">No products found</h3>
          <p class="mt-1 text-sm text-gray-500">Get started by creating a new product.</p>
          <div class="mt-6">
            <a href="/admin/products/create" class="btn btn-primary">
              Add Product
            </a>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>
