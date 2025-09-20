import { DatabaseService } from "$services/DatabaseService";
import type {
  Post,
  CreatePostData,
  UpdatePostData,
  PostWithAuthor,
} from "$models/Post";
import { writable } from "svelte/store";

// Store for posts
export const posts = writable<PostWithAuthor[]>([]);
export const currentPost = writable<PostWithAuthor | null>(null);

export class PostController {
  // Create a new post
  static async createPost(postData: CreatePostData, authorId: string) {
    try {
      const result = await DatabaseService.create("posts", {
        ...postData,
        author_id: authorId,
        published: postData.published ?? false,
      });

      // Refresh posts list
      await this.getAllPosts();

      return result;
    } catch (error) {
      console.error("Error creating post:", error);
      throw error;
    }
  }

  // Get all posts with author information
  static async getAllPosts() {
    try {
      const { data, error } = await DatabaseService.supabase
        .from("posts")
        .select(
          `
          *,
          author:profiles(id, name, avatar_url)
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      posts.set(data as PostWithAuthor[]);
      return data;
    } catch (error) {
      console.error("Error getting posts:", error);
      throw error;
    }
  }

  // Get post by ID with author information
  static async getPostById(postId: string) {
    try {
      const { data, error } = await DatabaseService.supabase
        .from("posts")
        .select(
          `
          *,
          author:profiles(id, name, avatar_url)
        `
        )
        .eq("id", postId)
        .single();

      if (error) throw error;

      currentPost.set(data as PostWithAuthor);
      return data;
    } catch (error) {
      console.error("Error getting post by ID:", error);
      throw error;
    }
  }

  // Update post
  static async updatePost(postId: string, updateData: UpdatePostData) {
    try {
      const result = await DatabaseService.update("posts", postId, updateData);

      // Refresh posts list and current post
      await this.getAllPosts();
      if (currentPost) {
        await this.getPostById(postId);
      }

      return result;
    } catch (error) {
      console.error("Error updating post:", error);
      throw error;
    }
  }

  // Delete post
  static async deletePost(postId: string) {
    try {
      await DatabaseService.delete("posts", postId);

      // Refresh posts list
      await this.getAllPosts();
      currentPost.set(null);

      return true;
    } catch (error) {
      console.error("Error deleting post:", error);
      throw error;
    }
  }

  // Get posts by author
  static async getPostsByAuthor(authorId: string) {
    try {
      const { data, error } = await DatabaseService.supabase
        .from("posts")
        .select(
          `
          *,
          author:profiles(id, name, avatar_url)
        `
        )
        .eq("author_id", authorId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data as PostWithAuthor[];
    } catch (error) {
      console.error("Error getting posts by author:", error);
      throw error;
    }
  }

  // Get published posts only
  static async getPublishedPosts() {
    try {
      const { data, error } = await DatabaseService.supabase
        .from("posts")
        .select(
          `
          *,
          author:profiles(id, name, avatar_url)
        `
        )
        .eq("published", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data as PostWithAuthor[];
    } catch (error) {
      console.error("Error getting published posts:", error);
      throw error;
    }
  }
}
