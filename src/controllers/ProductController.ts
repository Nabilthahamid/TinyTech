import { DatabaseService } from "$services/DatabaseService";
import { supabase } from "$lib/supabase";
import type {
  Product,
  CreateProductData,
  UpdateProductData,
  ProductWithCategory,
  ProductWithInventory,
} from "$models/Product";
import { writable } from "svelte/store";

// Store for products
export const products = writable<ProductWithCategory[]>([]);
export const currentProduct = writable<ProductWithInventory | null>(null);
export const categories = writable<any[]>([]);

export class ProductController {
  // Create a new product
  static async createProduct(productData: CreateProductData) {
    try {
      // Generate slug
      const slug = await this.generateSlug(productData.name);

      const result = await DatabaseService.create("products", {
        ...productData,
        slug: slug,
        status: productData.status || "draft",
        featured: productData.featured || false,
        images: productData.images || [],
        tags: productData.tags || [],
      });

      // Create inventory record
      await DatabaseService.create("inventory", {
        product_id: result.id,
        sku: result.sku,
        quantity: 0,
        reserved: 0,
        low_stock_threshold: 5,
        reorder_point: 10,
        reorder_quantity: 50,
      });

      // Refresh products list
      await this.getAllProducts();

      return result;
    } catch (error) {
      console.error("Error creating product:", error);
      throw error;
    }
  }

  // Get all products with category information
  static async getAllProducts() {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(
          `
          *,
          category:categories(id, name, slug)
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      products.set(data as ProductWithCategory[]);
      return data;
    } catch (error) {
      console.error("Error getting products:", error);
      throw error;
    }
  }

  // Get product by ID with full details
  static async getProductById(productId: string) {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(
          `
          *,
          category:categories(id, name, slug),
          inventory:inventory(id, quantity, reserved, available, low_stock_threshold, reorder_point, reorder_quantity, location, bin_location, notes)
        `
        )
        .eq("id", productId)
        .single();

      if (error) throw error;

      currentProduct.set(data as ProductWithInventory);
      return data;
    } catch (error) {
      console.error("Error getting product by ID:", error);
      throw error;
    }
  }

  // Update product
  static async updateProduct(productId: string, updateData: UpdateProductData) {
    try {
      // Generate new slug if name changed
      if (updateData.name) {
        updateData.slug = await this.generateSlug(updateData.name, productId);
      }

      const result = await DatabaseService.update(
        "products",
        productId,
        updateData
      );

      // Refresh products list and current product
      await this.getAllProducts();
      if (currentProduct) {
        await this.getProductById(productId);
      }

      return result;
    } catch (error) {
      console.error("Error updating product:", error);
      throw error;
    }
  }

  // Delete product
  static async deleteProduct(productId: string) {
    try {
      await DatabaseService.delete("products", productId);

      // Refresh products list
      await this.getAllProducts();
      currentProduct.set(null);

      return true;
    } catch (error) {
      console.error("Error deleting product:", error);
      throw error;
    }
  }

  // Get products by category
  static async getProductsByCategory(categoryId: string) {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(
          `
          *,
          category:categories(id, name, slug)
        `
        )
        .eq("category_id", categoryId)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data as ProductWithCategory[];
    } catch (error) {
      console.error("Error getting products by category:", error);
      throw error;
    }
  }

  // Get featured products
  static async getFeaturedProducts(limit: number = 10) {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(
          `
          *,
          category:categories(id, name, slug)
        `
        )
        .eq("featured", true)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data as ProductWithCategory[];
    } catch (error) {
      console.error("Error getting featured products:", error);
      throw error;
    }
  }

  // Search products
  static async searchProducts(query: string, filters: any = {}) {
    try {
      let queryBuilder = supabase
        .from("products")
        .select(
          `
          *,
          category:categories(id, name, slug)
        `
        )
        .eq("status", "active");

      // Add search conditions
      if (query) {
        queryBuilder = queryBuilder.or(
          `name.ilike.%${query}%,description.ilike.%${query}%,sku.ilike.%${query}%`
        );
      }

      // Add filters
      if (filters.category_id) {
        queryBuilder = queryBuilder.eq("category_id", filters.category_id);
      }

      if (filters.price_min) {
        queryBuilder = queryBuilder.gte("price", filters.price_min);
      }

      if (filters.price_max) {
        queryBuilder = queryBuilder.lte("price", filters.price_max);
      }

      if (filters.featured !== undefined) {
        queryBuilder = queryBuilder.eq("featured", filters.featured);
      }

      const { data, error } = await queryBuilder.order("created_at", {
        ascending: false,
      });

      if (error) throw error;

      return data as ProductWithCategory[];
    } catch (error) {
      console.error("Error searching products:", error);
      throw error;
    }
  }

  // Generate unique slug
  static async generateSlug(name: string, productId?: string): Promise<string> {
    try {
      const { data, error } = await supabase.rpc("generate_product_slug", {
        name: name,
        product_id: productId || null,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error generating slug:", error);
      // Fallback to manual slug generation
      const baseSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, "-")
        .trim();
      return baseSlug + "-" + Date.now();
    }
  }

  // Upload product image
  static async uploadProductImage(file: File, productId: string) {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${productId}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from("product-images")
        .upload(fileName, file);

      if (error) throw error;

      return data;
    } catch (error) {
      console.error("Error uploading product image:", error);
      throw error;
    }
  }

  // Get product analytics
  static async getProductAnalytics(productId: string) {
    try {
      // Get product views
      const { data: views, error: viewsError } = await supabase
        .from("product_views")
        .select("id")
        .eq("product_id", productId);

      // Get order items for this product
      const { data: orders, error: ordersError } = await supabase
        .from("order_items")
        .select(
          `
          quantity,
          total_price,
          order:orders(created_at, status)
        `
        )
        .eq("product_id", productId);

      if (viewsError || ordersError) {
        throw new Error("Failed to fetch product analytics");
      }

      const totalViews = views?.length || 0;
      const totalSold =
        orders?.reduce((sum, item) => sum + item.quantity, 0) || 0;
      const totalRevenue =
        orders?.reduce((sum, item) => sum + item.total_price, 0) || 0;

      return {
        totalViews,
        totalSold,
        totalRevenue,
        conversionRate: totalViews > 0 ? (totalSold / totalViews) * 100 : 0,
      };
    } catch (error) {
      console.error("Error getting product analytics:", error);
      throw error;
    }
  }

  // Get products with specifications
  static async getProductWithSpecifications(productId: string) {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(
          `
          *,
          category:categories(id, name, slug),
          inventory:inventory(id, quantity, reserved, available, low_stock_threshold),
          specifications:product_specifications(
            id,
            name,
            value,
            group_name,
            sort_order
          )
        `
        )
        .eq("id", productId)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error("Error getting product with specifications:", error);
      throw error;
    }
  }

  // Get related products
  static async getRelatedProducts(productId: string, limit: number = 4) {
    try {
      // First get the product's category
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("category_id, tags")
        .eq("id", productId)
        .single();

      if (productError || !product) {
        throw new Error("Product not found");
      }

      // Get related products from same category
      const { data, error } = await supabase
        .from("products")
        .select(
          `
          *,
          category:categories(id, name, slug)
        `
        )
        .eq("category_id", product.category_id)
        .eq("status", "active")
        .neq("id", productId)
        .limit(limit);

      if (error) throw error;

      return data;
    } catch (error) {
      console.error("Error getting related products:", error);
      throw error;
    }
  }

  // Get products by brand
  static async getProductsByBrand(brand: string, limit: number = 20) {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(
          `
          *,
          category:categories(id, name, slug)
        `
        )
        .eq("brand", brand)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data as ProductWithCategory[];
    } catch (error) {
      console.error("Error getting products by brand:", error);
      throw error;
    }
  }

  // Get all brands
  static async getAllBrands() {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("brand")
        .not("brand", "is", null)
        .eq("status", "active");

      if (error) throw error;

      // Extract unique brands
      const brands = [
        ...new Set(data.map((item) => item.brand).filter(Boolean)),
      ];
      return brands.sort();
    } catch (error) {
      console.error("Error getting brands:", error);
      throw error;
    }
  }

  // Advanced search with filters
  static async advancedSearch(filters: {
    query?: string;
    categoryId?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    inStock?: boolean;
    sortBy?: "newest" | "price_low" | "price_high" | "rating" | "popularity";
    page?: number;
    limit?: number;
  }) {
    try {
      let query = supabase
        .from("products")
        .select(
          `
          *,
          category:categories(id, name, slug),
          inventory:inventory(available),
          reviews:reviews(rating)
        `
        )
        .eq("status", "active");

      // Text search
      if (filters.query) {
        query = query.or(
          `name.ilike.%${filters.query}%,description.ilike.%${filters.query}%,sku.ilike.%${filters.query}%,tags.cs.{${filters.query}}`
        );
      }

      // Category filter
      if (filters.categoryId) {
        query = query.eq("category_id", filters.categoryId);
      }

      // Brand filter
      if (filters.brand) {
        query = query.eq("brand", filters.brand);
      }

      // Price filters
      if (filters.minPrice) {
        query = query.gte("price", filters.minPrice);
      }
      if (filters.maxPrice) {
        query = query.lte("price", filters.maxPrice);
      }

      // Stock filter
      if (filters.inStock) {
        query = query.gt("inventory.available", 0);
      }

      // Sort
      switch (filters.sortBy) {
        case "price_low":
          query = query.order("price", { ascending: true });
          break;
        case "price_high":
          query = query.order("price", { ascending: false });
          break;
        case "rating":
          // This would need a more complex query with average ratings
          query = query.order("created_at", { ascending: false });
          break;
        case "newest":
          query = query.order("created_at", { ascending: false });
          break;
        default:
          query = query.order("created_at", { ascending: false });
      }

      // Pagination
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const offset = (page - 1) * limit;

      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) throw error;

      return data as ProductWithCategory[];
    } catch (error) {
      console.error("Error in advanced search:", error);
      throw error;
    }
  }

  // Track product view
  static async trackProductView(productId: string, sessionId?: string) {
    try {
      const currentUser = await DatabaseService.getCurrentUser();

      const viewData: any = {
        product_id: productId,
        viewed_at: new Date().toISOString(),
      };

      if (currentUser) {
        viewData.user_id = currentUser.id;
      }

      if (sessionId) {
        viewData.session_id = sessionId;
      }

      // Don't await this - it's a tracking event
      supabase
        .from("product_views")
        .insert(viewData)
        .then(() => {
          // Successfully tracked
        })
        .catch((error) => {
          console.error("Error tracking product view:", error);
        });

      return true;
    } catch (error) {
      console.error("Error tracking product view:", error);
      return false;
    }
  }

  // Get product availability
  static async getProductAvailability(productId: string) {
    try {
      const { data, error } = await supabase
        .from("inventory")
        .select("available, low_stock_threshold")
        .eq("product_id", productId)
        .single();

      if (error) throw error;

      return {
        available: data.available,
        inStock: data.available > 0,
        lowStock: data.available <= data.low_stock_threshold,
        stockLevel:
          data.available > data.low_stock_threshold
            ? "in_stock"
            : data.available > 0
            ? "low_stock"
            : "out_of_stock",
      };
    } catch (error) {
      console.error("Error getting product availability:", error);
      throw error;
    }
  }
}
