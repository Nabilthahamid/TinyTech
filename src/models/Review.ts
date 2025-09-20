export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number; // 1-5 stars
  title?: string;
  content?: string;
  verified_purchase: boolean;
  helpful_count: number;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    name: string;
    avatar_url?: string;
  };
}

export interface CreateReviewData {
  product_id: string;
  rating: number;
  title?: string;
  content?: string;
}

export interface UpdateReviewData {
  rating?: number;
  title?: string;
  content?: string;
}

export interface ReviewStats {
  average_rating: number;
  total_reviews: number;
  rating_distribution: {
    "5": number;
    "4": number;
    "3": number;
    "2": number;
    "1": number;
  };
  verified_purchase_percentage: number;
}

export interface ReviewWithProduct extends Review {
  product: {
    id: string;
    name: string;
    featured_image?: string;
  };
}

export interface ReviewHelpfulness {
  id: string;
  review_id: string;
  user_id: string;
  is_helpful: boolean;
  created_at: string;
}
