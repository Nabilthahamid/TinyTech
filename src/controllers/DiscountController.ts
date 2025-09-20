import { DatabaseService } from "$services/DatabaseService";
import { supabase } from "$lib/supabase";
import type {
  Discount,
  CreateDiscountData,
  UpdateDiscountData,
  DiscountUsage,
  DiscountWithUsage,
  DiscountStats,
} from "$models/Discount";
import { writable } from "svelte/store";

// Store for discounts
export const discounts = writable<Discount[]>([]);
export const currentDiscount = writable<DiscountWithUsage | null>(null);
export const discountStats = writable<DiscountStats | null>(null);

export class DiscountController {
  // Create a new discount
  static async createDiscount(discountData: CreateDiscountData) {
    try {
      const result = await DatabaseService.create("discounts", {
        ...discountData,
        status: discountData.status || "active",
        used_count: 0,
        one_time_use: discountData.one_time_use || false,
        applies_to: discountData.applies_to || "all",
        categories: discountData.categories || [],
        products: discountData.products || [],
        users: discountData.users || [],
      });

      // Refresh discounts list
      await this.getAllDiscounts();

      return result;
    } catch (error) {
      console.error("Error creating discount:", error);
      throw error;
    }
  }

  // Get all discounts
  static async getAllDiscounts() {
    try {
      const { data, error } = await supabase
        .from("discounts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      discounts.set(data as Discount[]);
      return data;
    } catch (error) {
      console.error("Error getting discounts:", error);
      throw error;
    }
  }

  // Get discount by ID with usage details
  static async getDiscountById(discountId: string) {
    try {
      const { data, error } = await supabase
        .from("discounts")
        .select(
          `
          *,
          usage:discount_usage(
            id,
            order_id,
            user_id,
            amount_discounted,
            used_at,
            user:profiles(name, email),
            order:orders(order_number, total_amount)
          )
        `
        )
        .eq("id", discountId)
        .single();

      if (error) throw error;

      currentDiscount.set(data as DiscountWithUsage);
      return data;
    } catch (error) {
      console.error("Error getting discount by ID:", error);
      throw error;
    }
  }

  // Update discount
  static async updateDiscount(
    discountId: string,
    updateData: UpdateDiscountData
  ) {
    try {
      const result = await DatabaseService.update(
        "discounts",
        discountId,
        updateData
      );

      // Refresh discounts list and current discount
      await this.getAllDiscounts();
      if (currentDiscount) {
        await this.getDiscountById(discountId);
      }

      return result;
    } catch (error) {
      console.error("Error updating discount:", error);
      throw error;
    }
  }

  // Delete discount
  static async deleteDiscount(discountId: string) {
    try {
      await DatabaseService.delete("discounts", discountId);

      // Refresh discounts list
      await this.getAllDiscounts();
      currentDiscount.set(null);

      return true;
    } catch (error) {
      console.error("Error deleting discount:", error);
      throw error;
    }
  }

  // Get active discounts
  static async getActiveDiscounts() {
    try {
      const { data, error } = await supabase
        .from("discounts")
        .select("*")
        .eq("status", "active")
        .gt("valid_until", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data as Discount[];
    } catch (error) {
      console.error("Error getting active discounts:", error);
      throw error;
    }
  }

  // Get discount by code
  static async getDiscountByCode(code: string) {
    try {
      const { data, error } = await supabase
        .from("discounts")
        .select("*")
        .eq("code", code)
        .eq("status", "active")
        .gt("valid_until", new Date().toISOString())
        .single();

      if (error) throw error;

      return data as Discount;
    } catch (error) {
      console.error("Error getting discount by code:", error);
      throw error;
    }
  }

  // Validate discount code
  static async validateDiscountCode(
    code: string,
    userId?: string,
    cartTotal?: number
  ) {
    try {
      const discount = await this.getDiscountByCode(code);

      if (!discount) {
        return { valid: false, error: "Discount code not found" };
      }

      // Check if discount has expired
      if (new Date() > new Date(discount.valid_until)) {
        return { valid: false, error: "Discount code has expired" };
      }

      // Check if discount has reached usage limit
      if (discount.usage_limit && discount.used_count >= discount.usage_limit) {
        return { valid: false, error: "Discount code has reached usage limit" };
      }

      // Check minimum amount requirement
      if (
        discount.minimum_amount &&
        cartTotal &&
        cartTotal < discount.minimum_amount
      ) {
        return {
          valid: false,
          error: `Minimum order amount is $${discount.minimum_amount}`,
        };
      }

      // Check if user has already used this discount (for one-time use)
      if (discount.one_time_use && userId) {
        const { data: existingUsage, error: usageError } = await supabase
          .from("discount_usage")
          .select("id")
          .eq("discount_id", discount.id)
          .eq("user_id", userId)
          .single();

        if (usageError && usageError.code !== "PGRST116") {
          throw usageError;
        }

        if (existingUsage) {
          return { valid: false, error: "Discount code has already been used" };
        }
      }

      return { valid: true, discount };
    } catch (error) {
      console.error("Error validating discount code:", error);
      return { valid: false, error: "Invalid discount code" };
    }
  }

  // Apply discount to order
  static async applyDiscount(
    discountId: string,
    orderId: string,
    userId: string,
    amountDiscounted: number
  ) {
    try {
      // Create discount usage record
      const { data, error } = await supabase.from("discount_usage").insert({
        discount_id: discountId,
        order_id: orderId,
        user_id: userId,
        amount_discounted: amountDiscounted,
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error("Error applying discount:", error);
      throw error;
    }
  }

  // Get discount statistics
  static async getDiscountStats() {
    try {
      const { data: discounts, error: discountsError } = await supabase
        .from("discounts")
        .select("id, code, status, used_count");

      const { data: usage, error: usageError } = await supabase
        .from("discount_usage")
        .select("amount_discounted");

      if (discountsError || usageError)
        throw new Error("Failed to fetch discount stats");

      const totalDiscounts = discounts.length;
      const activeDiscounts = discounts.filter(
        (d) => d.status === "active"
      ).length;
      const totalDiscountsUsed = discounts.reduce(
        (sum, d) => sum + d.used_count,
        0
      );
      const totalAmountDiscounted = usage.reduce(
        (sum, u) => sum + u.amount_discounted,
        0
      );

      // Find most used discount
      const mostUsedDiscount = discounts.reduce(
        (prev, current) =>
          prev.used_count > current.used_count ? prev : current,
        discounts[0]
      );

      const stats = {
        totalDiscounts,
        activeDiscounts,
        totalDiscountsUsed,
        totalAmountDiscounted,
        mostUsedDiscount: mostUsedDiscount
          ? {
              id: mostUsedDiscount.id,
              code: mostUsedDiscount.code,
              usedCount: mostUsedDiscount.used_count,
            }
          : null,
      };

      discountStats.set(stats);
      return stats;
    } catch (error) {
      console.error("Error getting discount stats:", error);
      throw error;
    }
  }

  // Get discount usage history
  static async getDiscountUsageHistory(
    discountId?: string,
    limit: number = 50
  ) {
    try {
      let query = supabase
        .from("discount_usage")
        .select(
          `
          *,
          discount:discounts(code, name),
          user:profiles(name, email),
          order:orders(order_number, total_amount, created_at)
        `
        )
        .order("used_at", { ascending: false })
        .limit(limit);

      if (discountId) {
        query = query.eq("discount_id", discountId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data as DiscountUsage[];
    } catch (error) {
      console.error("Error getting discount usage history:", error);
      throw error;
    }
  }

  // Calculate discount amount
  static calculateDiscountAmount(
    discount: Discount,
    cartTotal: number
  ): number {
    let discountAmount = 0;

    switch (discount.type) {
      case "percentage":
        discountAmount = (cartTotal * discount.value) / 100;
        break;
      case "fixed_amount":
        discountAmount = discount.value;
        break;
      case "free_shipping":
        discountAmount = 0; // Free shipping is handled separately
        break;
    }

    // Apply maximum discount limit
    if (
      discount.maximum_discount &&
      discountAmount > discount.maximum_discount
    ) {
      discountAmount = discount.maximum_discount;
    }

    // Ensure discount doesn't exceed cart total
    if (discountAmount > cartTotal) {
      discountAmount = cartTotal;
    }

    return Math.round(discountAmount * 100) / 100; // Round to 2 decimal places
  }

  // Expire old discounts
  static async expireOldDiscounts() {
    try {
      const { data, error } = await supabase
        .from("discounts")
        .update({ status: "expired" })
        .lt("valid_until", new Date().toISOString())
        .eq("status", "active")
        .select();

      if (error) throw error;

      // Refresh discounts list
      await this.getAllDiscounts();

      return data;
    } catch (error) {
      console.error("Error expiring old discounts:", error);
      throw error;
    }
  }

  // Generate unique discount code
  static generateDiscountCode(
    prefix: string = "DISCOUNT",
    length: number = 8
  ): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = prefix.toUpperCase() + "-";

    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
  }
}
