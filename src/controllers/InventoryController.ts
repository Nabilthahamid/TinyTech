import { DatabaseService } from "$services/DatabaseService";
import { supabase } from "$lib/supabase";
import type {
  Inventory,
  InventoryTransaction,
  CreateInventoryData,
  UpdateInventoryData,
  InventoryAdjustment,
  LowStockAlert,
} from "$models/Inventory";
import { writable } from "svelte/store";

// Store for inventory
export const inventory = writable<Inventory[]>([]);
export const currentInventory = writable<Inventory | null>(null);
export const inventoryTransactions = writable<InventoryTransaction[]>([]);
export const lowStockAlerts = writable<LowStockAlert[]>([]);

export class InventoryController {
  // Get all inventory with product details
  static async getAllInventory() {
    try {
      const { data, error } = await supabase
        .from("inventory")
        .select(
          `
          *,
          product:products(id, name, sku, price, status)
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      inventory.set(data as Inventory[]);
      return data;
    } catch (error) {
      console.error("Error getting inventory:", error);
      throw error;
    }
  }

  // Get inventory by product ID
  static async getInventoryByProductId(productId: string) {
    try {
      const { data, error } = await supabase
        .from("inventory")
        .select(
          `
          *,
          product:products(id, name, sku, price, status)
        `
        )
        .eq("product_id", productId)
        .single();

      if (error) throw error;

      currentInventory.set(data as Inventory);
      return data;
    } catch (error) {
      console.error("Error getting inventory by product ID:", error);
      throw error;
    }
  }

  // Create inventory record
  static async createInventory(inventoryData: CreateInventoryData) {
    try {
      const result = await DatabaseService.create("inventory", {
        ...inventoryData,
        reserved: inventoryData.reserved || 0,
        low_stock_threshold: inventoryData.low_stock_threshold || 5,
        reorder_point: inventoryData.reorder_point || 10,
        reorder_quantity: inventoryData.reorder_quantity || 50,
      });

      // Refresh inventory list
      await this.getAllInventory();

      return result;
    } catch (error) {
      console.error("Error creating inventory:", error);
      throw error;
    }
  }

  // Update inventory
  static async updateInventory(
    inventoryId: string,
    updateData: UpdateInventoryData
  ) {
    try {
      const result = await DatabaseService.update(
        "inventory",
        inventoryId,
        updateData
      );

      // Refresh inventory list and current inventory
      await this.getAllInventory();
      if (currentInventory) {
        await this.getInventoryByProductId(result.product_id);
      }

      return result;
    } catch (error) {
      console.error("Error updating inventory:", error);
      throw error;
    }
  }

  // Delete inventory record
  static async deleteInventory(inventoryId: string) {
    try {
      await DatabaseService.delete("inventory", inventoryId);

      // Refresh inventory list
      await this.getAllInventory();
      currentInventory.set(null);

      return true;
    } catch (error) {
      console.error("Error deleting inventory:", error);
      throw error;
    }
  }

  // Adjust inventory quantity
  static async adjustInventory(adjustments: InventoryAdjustment[]) {
    try {
      const results = [];

      for (const adjustment of adjustments) {
        // Get current inventory
        const { data: currentInventory, error: fetchError } = await supabase
          .from("inventory")
          .select("*")
          .eq("product_id", adjustment.product_id)
          .single();

        if (fetchError) throw fetchError;

        // Calculate new quantity
        const newQuantity =
          currentInventory.quantity + adjustment.quantity_change;

        // Update inventory
        const { data: updatedInventory, error: updateError } = await supabase
          .from("inventory")
          .update({ quantity: newQuantity })
          .eq("product_id", adjustment.product_id)
          .select()
          .single();

        if (updateError) throw updateError;

        // Log transaction
        const { error: transactionError } = await supabase
          .from("inventory_transactions")
          .insert({
            product_id: adjustment.product_id,
            type: adjustment.type,
            quantity: Math.abs(adjustment.quantity_change),
            reference_type: "adjustment",
            notes: adjustment.notes,
          });

        if (transactionError) throw transactionError;

        results.push(updatedInventory);
      }

      // Refresh inventory list
      await this.getAllInventory();

      return results;
    } catch (error) {
      console.error("Error adjusting inventory:", error);
      throw error;
    }
  }

  // Stock in (add inventory)
  static async stockIn(productId: string, quantity: number, notes?: string) {
    try {
      return await this.adjustInventory([
        {
          product_id: productId,
          quantity_change: quantity,
          type: "in",
          notes: notes || "Stock in",
        },
      ]);
    } catch (error) {
      console.error("Error stocking in:", error);
      throw error;
    }
  }

  // Stock out (remove inventory)
  static async stockOut(productId: string, quantity: number, notes?: string) {
    try {
      return await this.adjustInventory([
        {
          product_id: productId,
          quantity_change: -quantity,
          type: "out",
          notes: notes || "Stock out",
        },
      ]);
    } catch (error) {
      console.error("Error stocking out:", error);
      throw error;
    }
  }

  // Get inventory transactions
  static async getInventoryTransactions(
    productId?: string,
    limit: number = 50
  ) {
    try {
      let query = supabase
        .from("inventory_transactions")
        .select(
          `
          *,
          product:products(id, name, sku),
          user:profiles(name)
        `
        )
        .order("created_at", { ascending: false })
        .limit(limit);

      if (productId) {
        query = query.eq("product_id", productId);
      }

      const { data, error } = await query;

      if (error) throw error;

      inventoryTransactions.set(data as InventoryTransaction[]);
      return data;
    } catch (error) {
      console.error("Error getting inventory transactions:", error);
      throw error;
    }
  }

  // Get low stock alerts
  static async getLowStockAlerts() {
    try {
      const { data, error } = await supabase
        .from("inventory")
        .select(
          `
          *,
          product:products(id, name, sku)
        `
        )
        .filter("available", "lte", supabase.raw("low_stock_threshold"));

      if (error) throw error;

      const alerts: LowStockAlert[] = data.map((item: any) => ({
        product_id: item.product_id,
        product_name: item.product?.name || "Unknown Product",
        sku: item.sku,
        current_quantity: item.available,
        low_stock_threshold: item.low_stock_threshold,
        reorder_point: item.reorder_point,
      }));

      lowStockAlerts.set(alerts);
      return alerts;
    } catch (error) {
      console.error("Error getting low stock alerts:", error);
      throw error;
    }
  }

  // Get out of stock products
  static async getOutOfStockProducts() {
    try {
      const { data, error } = await supabase
        .from("inventory")
        .select(
          `
          *,
          product:products(id, name, sku, status)
        `
        )
        .eq("available", 0)
        .eq("product.status", "active");

      if (error) throw error;

      return data;
    } catch (error) {
      console.error("Error getting out of stock products:", error);
      throw error;
    }
  }

  // Get inventory analytics
  static async getInventoryAnalytics() {
    try {
      const { data: inventory, error: inventoryError } = await supabase.from(
        "inventory"
      ).select(`
          quantity,
          available,
          low_stock_threshold,
          product:products(id, name, price)
        `);

      if (inventoryError) throw inventoryError;

      const totalProducts = inventory.length;
      const lowStockProducts = inventory.filter(
        (item) => item.available <= item.low_stock_threshold
      ).length;
      const outOfStockProducts = inventory.filter(
        (item) => item.available === 0
      ).length;
      const totalInventoryValue = inventory.reduce(
        (sum, item) => sum + item.available * (item.product?.price || 0),
        0
      );
      const averageStockLevel =
        inventory.reduce((sum, item) => sum + item.available, 0) /
        totalProducts;

      return {
        totalProducts,
        lowStockProducts,
        outOfStockProducts,
        totalInventoryValue,
        averageStockLevel,
      };
    } catch (error) {
      console.error("Error getting inventory analytics:", error);
      throw error;
    }
  }

  // Bulk update inventory
  static async bulkUpdateInventory(
    updates: Array<{ id: string; quantity: number; notes?: string }>
  ) {
    try {
      const results = [];

      for (const update of updates) {
        const result = await this.adjustInventory([
          {
            product_id: update.id,
            quantity_change: update.quantity,
            type: "adjustment",
            notes: update.notes || "Bulk update",
          },
        ]);

        results.push(result[0]);
      }

      return results;
    } catch (error) {
      console.error("Error bulk updating inventory:", error);
      throw error;
    }
  }

  // Set reorder points
  static async setReorderPoints(
    updates: Array<{
      productId: string;
      reorderPoint: number;
      reorderQuantity: number;
    }>
  ) {
    try {
      const results = [];

      for (const update of updates) {
        const { data, error } = await supabase
          .from("inventory")
          .update({
            reorder_point: update.reorderPoint,
            reorder_quantity: update.reorderQuantity,
          })
          .eq("product_id", update.productId)
          .select()
          .single();

        if (error) throw error;

        results.push(data);
      }

      // Refresh inventory list
      await this.getAllInventory();

      return results;
    } catch (error) {
      console.error("Error setting reorder points:", error);
      throw error;
    }
  }

  // Get inventory report
  static async getInventoryReport() {
    try {
      const { data, error } = await supabase
        .from("inventory")
        .select(
          `
          *,
          product:products(id, name, sku, price, status)
        `
        )
        .eq("product.status", "active")
        .order("available", { ascending: true });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error("Error getting inventory report:", error);
      throw error;
    }
  }
}
