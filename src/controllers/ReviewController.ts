import { DatabaseService } from "$services/DatabaseService";
import { supabase } from "$lib/supabase";
import type {
  Review,
  CreateReviewData,
  UpdateReviewData,
  ReviewStats,
  ReviewWithProduct,
  ReviewHelpfulness,
} from "$models/Review";
import { writable } from "svelte/store";

// Store for reviews
export const reviews = writable<Review[]>([]);
export const reviewStats = writable<ReviewStats | null>(null);
export const currentReview = writable<Review | null>(null);

export class ReviewController {
  // Create a new review
  static async createReview(reviewData: CreateReviewData) {
    try {
      const currentUser = await DatabaseService.getCurrentUser();
      if (!currentUser) {
        throw new Error("User must be logged in to create a review");
      }

      // Check if user has already reviewed this product
      const { data: existingReview, error: existingError } = await supabase
        .from("reviews")
        .select("id")
        .eq("product_id", reviewData.product_id)
        .eq("user_id", currentUser.id)
        .single();

      if (existingReview) {
        throw new Error("You have already reviewed this product");
      }

      // Check if user has purchased this product (for verified purchase)
      const { data: purchase, error: purchaseError } = await supabase
        .from("order_items")
        .select("id")
        .eq("product_id", reviewData.product_id)
        .in(
          "order_id",
          supabase
            .from("orders")
            .select("id")
            .eq("user_id", currentUser.id)
            .eq("status", "delivered")
        )
        .limit(1);

      const verifiedPurchase =
        !purchaseError && purchase && purchase.length > 0;

      const result = await DatabaseService.create("reviews", {
        ...reviewData,
        user_id: currentUser.id,
        verified_purchase: verifiedPurchase,
        status: "pending", // Reviews need approval
      });

      // Refresh reviews for this product
      await this.getReviewsByProduct(reviewData.product_id);

      return result;
    } catch (error) {
      console.error("Error creating review:", error);
      throw error;
    }
  }

  // Get reviews by product ID
  static async getReviewsByProduct(productId: string, limit: number = 50) {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select(
          `
          *,
          user:profiles(id, name, avatar_url)
        `
        )
        .eq("product_id", productId)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      reviews.set(data as Review[]);
      return data;
    } catch (error) {
      console.error("Error getting reviews by product:", error);
      throw error;
    }
  }

  // Get review by ID
  static async getReviewById(reviewId: string) {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select(
          `
          *,
          user:profiles(id, name, avatar_url)
        `
        )
        .eq("id", reviewId)
        .single();

      if (error) throw error;

      currentReview.set(data as Review);
      return data;
    } catch (error) {
      console.error("Error getting review by ID:", error);
      throw error;
    }
  }

  // Update review
  static async updateReview(reviewId: string, updateData: UpdateReviewData) {
    try {
      const currentUser = await DatabaseService.getCurrentUser();
      if (!currentUser) {
        throw new Error("User must be logged in to update a review");
      }

      // Verify user owns this review
      const { data: review, error: fetchError } = await supabase
        .from("reviews")
        .select("user_id")
        .eq("id", reviewId)
        .single();

      if (fetchError || !review) {
        throw new Error("Review not found");
      }

      if (review.user_id !== currentUser.id) {
        throw new Error("You can only update your own reviews");
      }

      const result = await DatabaseService.update("reviews", reviewId, {
        ...updateData,
        status: "pending", // Re-approval needed after update
      });

      // Refresh current review
      await this.getReviewById(reviewId);

      return result;
    } catch (error) {
      console.error("Error updating review:", error);
      throw error;
    }
  }

  // Delete review
  static async deleteReview(reviewId: string) {
    try {
      const currentUser = await DatabaseService.getCurrentUser();
      if (!currentUser) {
        throw new Error("User must be logged in to delete a review");
      }

      // Verify user owns this review
      const { data: review, error: fetchError } = await supabase
        .from("reviews")
        .select("user_id, product_id")
        .eq("id", reviewId)
        .single();

      if (fetchError || !review) {
        throw new Error("Review not found");
      }

      if (review.user_id !== currentUser.id) {
        throw new Error("You can only delete your own reviews");
      }

      await DatabaseService.delete("reviews", reviewId);

      // Refresh reviews for this product
      await this.getReviewsByProduct(review.product_id);

      return true;
    } catch (error) {
      console.error("Error deleting review:", error);
      throw error;
    }
  }

  // Get review statistics for a product
  static async getReviewStats(productId: string): Promise<ReviewStats> {
    try {
      const { data: reviews, error } = await supabase
        .from("reviews")
        .select("rating, verified_purchase")
        .eq("product_id", productId)
        .eq("status", "approved");

      if (error) throw error;

      const totalReviews = reviews.length;
      if (totalReviews === 0) {
        const emptyStats: ReviewStats = {
          average_rating: 0,
          total_reviews: 0,
          rating_distribution: { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 },
          verified_purchase_percentage: 0,
        };
        reviewStats.set(emptyStats);
        return emptyStats;
      }

      // Calculate average rating
      const averageRating =
        reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews;

      // Calculate rating distribution
      const ratingDistribution = reviews.reduce(
        (dist, review) => {
          dist[review.rating.toString() as keyof typeof dist]++;
          return dist;
        },
        { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 }
      );

      // Calculate verified purchase percentage
      const verifiedPurchases = reviews.filter(
        (review) => review.verified_purchase
      ).length;
      const verifiedPurchasePercentage =
        (verifiedPurchases / totalReviews) * 100;

      const stats: ReviewStats = {
        average_rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        total_reviews: totalReviews,
        rating_distribution: ratingDistribution,
        verified_purchase_percentage: Math.round(verifiedPurchasePercentage),
      };

      reviewStats.set(stats);
      return stats;
    } catch (error) {
      console.error("Error getting review stats:", error);
      throw error;
    }
  }

  // Mark review as helpful
  static async markReviewHelpful(reviewId: string, isHelpful: boolean) {
    try {
      const currentUser = await DatabaseService.getCurrentUser();
      if (!currentUser) {
        throw new Error("User must be logged in to mark review helpful");
      }

      // Check if user has already voted
      const { data: existingVote, error: existingError } = await supabase
        .from("review_helpfulness")
        .select("id, is_helpful")
        .eq("review_id", reviewId)
        .eq("user_id", currentUser.id)
        .single();

      if (existingVote) {
        // Update existing vote
        const { error } = await supabase
          .from("review_helpfulness")
          .update({ is_helpful })
          .eq("id", existingVote.id);

        if (error) throw error;
      } else {
        // Create new vote
        const { error } = await supabase.from("review_helpfulness").insert({
          review_id: reviewId,
          user_id: currentUser.id,
          is_helpful,
        });

        if (error) throw error;
      }

      return true;
    } catch (error) {
      console.error("Error marking review helpful:", error);
      throw error;
    }
  }

  // Get user's reviews
  static async getUserReviews(userId?: string) {
    try {
      const currentUser = await DatabaseService.getCurrentUser();
      const targetUserId = userId || currentUser?.id;

      if (!targetUserId) {
        throw new Error("User ID is required");
      }

      const { data, error } = await supabase
        .from("reviews")
        .select(
          `
          *,
          product:products(id, name, featured_image),
          user:profiles(id, name, avatar_url)
        `
        )
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data as ReviewWithProduct[];
    } catch (error) {
      console.error("Error getting user reviews:", error);
      throw error;
    }
  }

  // Get reviews by rating
  static async getReviewsByRating(
    productId: string,
    rating: number,
    limit: number = 20
  ) {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select(
          `
          *,
          user:profiles(id, name, avatar_url)
        `
        )
        .eq("product_id", productId)
        .eq("rating", rating)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data as Review[];
    } catch (error) {
      console.error("Error getting reviews by rating:", error);
      throw error;
    }
  }

  // Get recent reviews across all products
  static async getRecentReviews(limit: number = 20) {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select(
          `
          *,
          product:products(id, name, featured_image),
          user:profiles(id, name, avatar_url)
        `
        )
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data as ReviewWithProduct[];
    } catch (error) {
      console.error("Error getting recent reviews:", error);
      throw error;
    }
  }

  // Admin: Get pending reviews
  static async getPendingReviews(limit: number = 50) {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select(
          `
          *,
          product:products(id, name, featured_image),
          user:profiles(id, name, avatar_url)
        `
        )
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data as ReviewWithProduct[];
    } catch (error) {
      console.error("Error getting pending reviews:", error);
      throw error;
    }
  }

  // Admin: Approve review
  static async approveReview(reviewId: string) {
    try {
      const result = await DatabaseService.update("reviews", reviewId, {
        status: "approved",
      });

      return result;
    } catch (error) {
      console.error("Error approving review:", error);
      throw error;
    }
  }

  // Admin: Reject review
  static async rejectReview(reviewId: string) {
    try {
      const result = await DatabaseService.update("reviews", reviewId, {
        status: "rejected",
      });

      return result;
    } catch (error) {
      console.error("Error rejecting review:", error);
      throw error;
    }
  }
}
