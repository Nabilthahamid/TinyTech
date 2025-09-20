<script lang="ts">
  import type { PostWithAuthor } from '$models/Post';
  
  export let post: PostWithAuthor;
  
  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  function truncateText(text: string, maxLength: number = 150) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
</script>

<article class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
  <div class="p-6">
    <div class="flex items-center mb-4">
      {#if post.author.avatar_url}
        <img 
          src={post.author.avatar_url} 
          alt={post.author.name}
          class="w-10 h-10 rounded-full mr-3"
        />
      {:else}
        <div class="w-10 h-10 bg-gray-300 rounded-full mr-3 flex items-center justify-center">
          <span class="text-gray-600 font-medium">
            {post.author.name?.charAt(0) || 'U'}
          </span>
        </div>
      {/if}
      <div>
        <h3 class="font-medium text-gray-900">{post.author.name || 'Anonymous'}</h3>
        <p class="text-sm text-gray-500">{formatDate(post.created_at)}</p>
      </div>
    </div>
    
    <h2 class="text-xl font-semibold text-gray-900 mb-3 hover:text-blue-600 transition-colors">
      <a href="/posts/{post.id}">{post.title}</a>
    </h2>
    
    <p class="text-gray-600 mb-4">
      {truncateText(post.content)}
    </p>
    
    <div class="flex justify-between items-center">
      <a 
        href="/posts/{post.id}" 
        class="text-blue-600 hover:text-blue-800 font-medium transition-colors"
      >
        Read more →
      </a>
      
      {#if !post.published}
        <span class="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
          Draft
        </span>
      {/if}
    </div>
  </div>
</article>
