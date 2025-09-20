<script lang="ts">
  import { onMount } from 'svelte';
  import { PostController } from '$controllers/PostController';
  import { ProductController } from '$controllers/ProductController';
  import { currentUser } from '$controllers/UserController';
  import PostCard from '$components/PostCard.svelte';
  import ProductCard from '$components/ProductCard.svelte';
  import type { ProductWithCategory } from '$models/Product';

  let posts: any[] = [];
  let featuredProducts: ProductWithCategory[] = [];
  let loading = true;

  onMount(async () => {
    try {
      const [postsData, productsData] = await Promise.all([
        PostController.getPublishedPosts(),
        ProductController.advancedSearch({
          limit: 6,
          sortBy: 'newest'
        })
      ]);
      
      posts = postsData;
      featuredProducts = productsData;
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      loading = false;
    }
  });
</script>

<svelte:head>
  <title>Home - My MVC App</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <!-- Hero Section -->
  <div class="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
      <div class="text-center">
        <h1 class="text-4xl md:text-6xl font-bold mb-6">
          Welcome to TinyTech
        </h1>
        <p class="text-xl md:text-2xl mb-8 text-indigo-100">
          Discover amazing products and share your thoughts with the community
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="/catalog" class="btn btn-white btn-lg">
            Browse Products
          </a>
          <a href="/posts" class="btn btn-outline-white btn-lg">
            Read Posts
          </a>
        </div>
      </div>
    </div>
  </div>

  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
    {#if loading}
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p class="mt-4 text-gray-600">Loading content...</p>
      </div>
    {:else}
      <!-- Featured Products -->
      {#if featuredProducts.length > 0}
        <section class="mb-16">
          <div class="flex items-center justify-between mb-8">
            <h2 class="text-3xl font-bold text-gray-900">Featured Products</h2>
            <a href="/catalog" class="text-indigo-600 hover:text-indigo-500 font-medium">
              View all products →
            </a>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            {#each featuredProducts as product (product.id)}
              <ProductCard {product} />
            {/each}
          </div>
        </section>
      {/if}

      <!-- Latest Posts -->
      {#if posts.length > 0}
        <section>
          <div class="flex items-center justify-between mb-8">
            <h2 class="text-3xl font-bold text-gray-900">Latest Posts</h2>
            <a href="/posts" class="text-indigo-600 hover:text-indigo-500 font-medium">
              View all posts →
            </a>
          </div>
          <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {#each posts.slice(0, 6) as post (post.id)}
              <PostCard {post} />
            {/each}
          </div>
        </section>
      {:else}
        <div class="text-center py-12">
          <h2 class="text-2xl font-semibold text-gray-900 mb-4">No posts yet</h2>
          <p class="text-gray-600 mb-6">
            {#if $currentUser}
              <a href="/posts/create" class="btn btn-primary">Create your first post</a>
            {:else}
              <a href="/auth/signin" class="btn btn-primary">Sign in to create posts</a>
            {/if}
          </p>
        </div>
      {/if}
    {/if}
  </div>
</div>
