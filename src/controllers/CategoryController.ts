import { DatabaseService } from "$services/DatabaseService";
import { supabase } from "$lib/supabase";
import type {
  Category,
  CreateCategoryData,
  UpdateCategoryData,
  CategoryWithChildren,
  CategoryTree,
} from "$models/Category";
import { writable } from "svelte/store";

// Store for categories
export const categories = writable<Category[]>([]);
export const categoryTree = writable<CategoryTree[]>([]);
export const currentCategory = writable<Category | null>(null);

export class CategoryController {
  // Create a new category
  static async createCategory(categoryData: CreateCategoryData) {
    try {
      // Generate slug
      const slug = await this.generateSlug(categoryData.name);

      const result = await DatabaseService.create("categories", {
        ...categoryData,
        slug: slug,
        status: categoryData.status || "active",
        sort_order: categoryData.sort_order || 0,
      });

      // Refresh categories list
      await this.getAllCategories();

      return result;
    } catch (error) {
      console.error("Error creating category:", error);
      throw error;
    }
  }

  // Get all categories
  static async getAllCategories() {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;

      categories.set(data as Category[]);
      return data;
    } catch (error) {
      console.error("Error getting categories:", error);
      throw error;
    }
  }

  // Get category by ID
  static async getCategoryById(categoryId: string) {
    try {
      const category = await DatabaseService.read("categories", categoryId);
      currentCategory.set(category as Category);
      return category;
    } catch (error) {
      console.error("Error getting category by ID:", error);
      throw error;
    }
  }

  // Update category
  static async updateCategory(
    categoryId: string,
    updateData: UpdateCategoryData
  ) {
    try {
      // Generate new slug if name changed
      if (updateData.name) {
        updateData.slug = await this.generateSlug(updateData.name, categoryId);
      }

      const result = await DatabaseService.update(
        "categories",
        categoryId,
        updateData
      );

      // Refresh categories list and current category
      await this.getAllCategories();
      if (currentCategory) {
        await this.getCategoryById(categoryId);
      }

      return result;
    } catch (error) {
      console.error("Error updating category:", error);
      throw error;
    }
  }

  // Delete category
  static async deleteCategory(categoryId: string) {
    try {
      await DatabaseService.delete("categories", categoryId);

      // Refresh categories list
      await this.getAllCategories();
      currentCategory.set(null);

      return true;
    } catch (error) {
      console.error("Error deleting category:", error);
      throw error;
    }
  }

  // Get category tree (hierarchical structure)
  static async getCategoryTree() {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("status", "active")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;

      // Build tree structure
      const tree = this.buildCategoryTree(data as Category[]);
      categoryTree.set(tree);
      return tree;
    } catch (error) {
      console.error("Error getting category tree:", error);
      throw error;
    }
  }

  // Get categories with product counts
  static async getCategoriesWithProductCounts() {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select(
          `
          *,
          products:products(id)
        `
        )
        .eq("status", "active")
        .order("sort_order", { ascending: true });

      if (error) throw error;

      // Add product count to each category
      const categoriesWithCounts = data.map((category: any) => ({
        ...category,
        product_count: category.products?.length || 0,
      }));

      return categoriesWithCounts;
    } catch (error) {
      console.error("Error getting categories with product counts:", error);
      throw error;
    }
  }

  // Get parent categories (categories without parent)
  static async getParentCategories() {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .is("parent_id", null)
        .eq("status", "active")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;

      return data as Category[];
    } catch (error) {
      console.error("Error getting parent categories:", error);
      throw error;
    }
  }

  // Get child categories
  static async getChildCategories(parentId: string) {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("parent_id", parentId)
        .eq("status", "active")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;

      return data as Category[];
    } catch (error) {
      console.error("Error getting child categories:", error);
      throw error;
    }
  }

  // Generate unique slug
  static async generateSlug(
    name: string,
    categoryId?: string
  ): Promise<string> {
    try {
      const { data, error } = await supabase.rpc("generate_category_slug", {
        name: name,
        category_id: categoryId || null,
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

  // Build category tree from flat array
  private static buildCategoryTree(
    categories: Category[],
    parentId: string | null = null,
    level: number = 0
  ): CategoryTree[] {
    return categories
      .filter((category) => category.parent_id === parentId)
      .map((category) => ({
        ...category,
        level,
        path: this.buildCategoryPath(category, categories),
        children: this.buildCategoryTree(categories, category.id, level + 1),
      }));
  }

  // Build category path (breadcrumb)
  private static buildCategoryPath(
    category: Category,
    allCategories: Category[]
  ): string {
    const path: string[] = [];
    let currentCategory = category;

    while (currentCategory) {
      path.unshift(currentCategory.name);
      currentCategory = allCategories.find(
        (c) => c.id === currentCategory.parent_id
      );
    }

    return path.join(" > ");
  }

  // Reorder categories
  static async reorderCategories(categoryIds: string[]) {
    try {
      const updates = categoryIds.map((id, index) => ({
        id,
        sort_order: index,
      }));

      for (const update of updates) {
        await DatabaseService.update("categories", update.id, {
          sort_order: update.sort_order,
        });
      }

      // Refresh categories list
      await this.getAllCategories();

      return true;
    } catch (error) {
      console.error("Error reordering categories:", error);
      throw error;
    }
  }

  // Get category analytics
  static async getCategoryAnalytics(categoryId: string) {
    try {
      // Get products in this category
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id")
        .eq("category_id", categoryId)
        .eq("status", "active");

      // Get order items for products in this category
      const { data: orderItems, error: orderItemsError } = await supabase
        .from("order_items")
        .select(
          `
          quantity,
          total_price,
          product:products(id, category_id)
        `
        )
        .in("product_id", products?.map((p) => p.id) || []);

      if (productsError || orderItemsError) {
        throw new Error("Failed to fetch category analytics");
      }

      const totalProducts = products?.length || 0;
      const totalSold =
        orderItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;
      const totalRevenue =
        orderItems?.reduce((sum, item) => sum + item.total_price, 0) || 0;
      const averagePrice = totalSold > 0 ? totalRevenue / totalSold : 0;

      return {
        totalProducts,
        totalSold,
        totalRevenue,
        averagePrice,
      };
    } catch (error) {
      console.error("Error getting category analytics:", error);
      throw error;
    }
  }
}
