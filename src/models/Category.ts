export interface Category {
  id: string;
  name: string;
  description?: string;
  slug: string;
  parent_id?: string;
  image?: string;
  meta_title?: string;
  meta_description?: string;
  sort_order: number;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryData {
  name: string;
  description?: string;
  parent_id?: string;
  image?: string;
  meta_title?: string;
  meta_description?: string;
  sort_order?: number;
  status?: "active" | "inactive";
}

export interface UpdateCategoryData {
  name?: string;
  description?: string;
  parent_id?: string;
  image?: string;
  meta_title?: string;
  meta_description?: string;
  sort_order?: number;
  status?: "active" | "inactive";
}

export interface CategoryWithChildren extends Category {
  children?: CategoryWithChildren[];
  product_count?: number;
}

export interface CategoryTree extends CategoryWithChildren {
  level: number;
  path: string;
}
