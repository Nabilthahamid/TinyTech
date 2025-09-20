export interface Product {
  id: string;
  name: string;
  description: string;
  short_description?: string;
  sku: string;
  price: number;
  compare_at_price?: number;
  cost_price?: number;
  category_id: string;
  brand?: string;
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  images: string[];
  featured_image?: string;
  tags: string[];
  status: "active" | "inactive" | "draft";
  featured: boolean;
  meta_title?: string;
  meta_description?: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProductData {
  name: string;
  description: string;
  short_description?: string;
  sku: string;
  price: number;
  compare_at_price?: number;
  cost_price?: number;
  category_id: string;
  brand?: string;
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  images?: string[];
  tags?: string[];
  status?: "active" | "inactive" | "draft";
  featured?: boolean;
  meta_title?: string;
  meta_description?: string;
}

export interface UpdateProductData {
  name?: string;
  description?: string;
  short_description?: string;
  sku?: string;
  price?: number;
  compare_at_price?: number;
  cost_price?: number;
  category_id?: string;
  brand?: string;
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  images?: string[];
  tags?: string[];
  status?: "active" | "inactive" | "draft";
  featured?: boolean;
  meta_title?: string;
  meta_description?: string;
}

export interface ProductWithCategory extends Product {
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface ProductWithInventory extends ProductWithCategory {
  inventory: {
    id: string;
    quantity: number;
    reserved: number;
    available: number;
    low_stock_threshold: number;
  };
}
