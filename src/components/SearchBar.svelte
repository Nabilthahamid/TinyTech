<script lang="ts">
  import { onMount } from "svelte";
  import { ProductController } from "$controllers/ProductController";
  import type { ProductWithCategory } from "$models/Product";

  export let placeholder = "Search products...";
  export let showSuggestions = true;
  export let onSelect: (product: ProductWithCategory) => void = () => {};

  let searchQuery = "";
  let suggestions: ProductWithCategory[] = [];
  let showSuggestionsList = false;
  let loading = false;
  let selectedIndex = -1;

  let searchInput: HTMLInputElement;

  // Debounce search
  let searchTimeout: NodeJS.Timeout;

  async function performSearch(query: string) {
    if (!query.trim() || query.length < 2) {
      suggestions = [];
      showSuggestionsList = false;
      return;
    }

    try {
      loading = true;
      const results = await ProductController.advancedSearch({
        query: query.trim(),
        limit: 5
      });
      
      suggestions = results;
      showSuggestionsList = results.length > 0;
      selectedIndex = -1;
    } catch (err) {
      console.error("Error searching products:", err);
      suggestions = [];
      showSuggestionsList = false;
    } finally {
      loading = false;
    }
  }

  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    searchQuery = target.value;

    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Set new timeout for debounced search
    searchTimeout = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (!showSuggestionsList || suggestions.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
        break;
      case 'Enter':
        event.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          selectProduct(suggestions[selectedIndex]);
        } else if (searchQuery.trim()) {
          // Navigate to search results page
          window.location.href = `/catalog/search?q=${encodeURIComponent(searchQuery.trim())}`;
        }
        break;
      case 'Escape':
        hideSuggestions();
        break;
    }
  }

  function selectProduct(product: ProductWithCategory) {
    onSelect(product);
    hideSuggestions();
    searchQuery = "";
    if (searchInput) {
      searchInput.value = "";
    }
  }

  function hideSuggestions() {
    showSuggestionsList = false;
    selectedIndex = -1;
    if (searchInput) {
      searchInput.blur();
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  // Hide suggestions when clicking outside
  function handleClickOutside(event: MouseEvent) {
    const target = event.target as Element;
    if (!target.closest('.search-container')) {
      hideSuggestions();
    }
  }

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  });
</script>

<div class="search-container relative w-full max-w-md">
  <!-- Search Input -->
  <div class="relative">
    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
      </svg>
    </div>
    
    <input
      bind:this={searchInput}
      type="text"
      placeholder={placeholder}
      value={searchQuery}
      on:input={handleInput}
      on:keydown={handleKeyDown}
      on:focus={() => {
        if (suggestions.length > 0) {
          showSuggestionsList = true;
        }
      }}
      class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
    />
    
    <!-- Loading Indicator -->
    {#if loading}
      <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
      </div>
    {/if}
  </div>

  <!-- Search Suggestions -->
  {#if showSuggestions && showSuggestionsList && suggestions.length > 0}
    <div class="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 overflow-hidden">
      <div class="py-1">
        {#each suggestions as product, index}
          <button
            type="button"
            on:click={() => selectProduct(product)}
            class="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none {selectedIndex === index ? 'bg-gray-50' : ''}"
          >
            <div class="flex items-center space-x-3">
              <!-- Product Image -->
              <div class="flex-shrink-0">
                {#if product.featured_image}
                  <img
                    src={product.featured_image}
                    alt={product.name}
                    class="h-10 w-10 object-cover object-center rounded"
                  />
                {:else}
                  <div class="h-10 w-10 bg-gray-200 rounded flex items-center justify-center">
                    <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                {/if}
              </div>
              
              <!-- Product Info -->
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 truncate">
                  {product.name}
                </p>
                {#if product.brand}
                  <p class="text-xs text-gray-500 truncate">{product.brand}</p>
                {/if}
              </div>
              
              <!-- Price -->
              <div class="flex-shrink-0">
                <p class="text-sm font-medium text-gray-900">
                  {formatCurrency(product.price)}
                </p>
              </div>
            </div>
          </button>
        {/each}
        
        <!-- View All Results -->
        {#if searchQuery.trim()}
          <div class="border-t border-gray-100">
            <a
              href="/catalog/search?q={encodeURIComponent(searchQuery.trim())}"
              class="block w-full px-4 py-2 text-sm text-indigo-600 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
            >
              View all results for "{searchQuery.trim()}"
            </a>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
