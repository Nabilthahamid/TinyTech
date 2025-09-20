export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product: {
    id: string;
    name: string;
    sku: string;
    price: number;
    compare_at_price?: number;
    featured_image?: string;
    status: string;
    inventory?: {
      available: number;
    };
  };
}

export interface CreateWishlistItemData {
  product_id: string;
}

export interface Wishlist {
  id: string;
  user_id: string;
  name?: string;
  is_public: boolean;
  items: WishlistItem[];
  created_at: string;
  updated_at: string;
}
