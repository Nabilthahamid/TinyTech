import { DatabaseService } from "$services/DatabaseService";
import { supabase } from "$lib/supabase";
import type { User } from "$models/User";
import { writable } from "svelte/store";

// Store for admin user state
export const adminUser = writable<User | null>(null);
export const adminRole = writable<string | null>(null);

export class AdminController {
  // Check if user is admin
  static async checkAdminRole(): Promise<boolean> {
    try {
      const currentUser = await DatabaseService.getCurrentUser();
      if (!currentUser) return false;

      const { data, error } = await supabase
        .from("admin_roles")
        .select("role")
        .eq("user_id", currentUser.id)
        .single();

      if (error || !data) return false;

      adminRole.set(data.role);
      return true;
    } catch (error) {
      console.error("Error checking admin role:", error);
      return false;
    }
  }

  // Get admin role
  static async getAdminRole(): Promise<string | null> {
    try {
      const currentUser = await DatabaseService.getCurrentUser();
      if (!currentUser) return null;

      const { data, error } = await supabase
        .from("admin_roles")
        .select("role")
        .eq("user_id", currentUser.id)
        .single();

      if (error || !data) return null;

      return data.role;
    } catch (error) {
      console.error("Error getting admin role:", error);
      return null;
    }
  }

  // Check if user has specific permission
  static async hasPermission(permission: string): Promise<boolean> {
    try {
      const currentUser = await DatabaseService.getCurrentUser();
      if (!currentUser) return false;

      const { data, error } = await supabase
        .from("admin_roles")
        .select("role, permissions")
        .eq("user_id", currentUser.id)
        .single();

      if (error || !data) return false;

      // Super admin has all permissions
      if (data.role === "super_admin") return true;

      // Check specific permissions
      return data.permissions?.includes(permission) || false;
    } catch (error) {
      console.error("Error checking permission:", error);
      return false;
    }
  }

  // Get all admin users
  static async getAdminUsers() {
    try {
      const { data, error } = await supabase
        .from("admin_roles")
        .select(
          `
          *,
          user:profiles(id, name, email, created_at)
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error getting admin users:", error);
      throw error;
    }
  }

  // Create admin user
  static async createAdminUser(
    userId: string,
    role: string,
    permissions: string[] = []
  ) {
    try {
      const result = await DatabaseService.create("admin_roles", {
        user_id: userId,
        role: role,
        permissions: permissions,
      });

      return result;
    } catch (error) {
      console.error("Error creating admin user:", error);
      throw error;
    }
  }

  // Update admin user
  static async updateAdminUser(
    adminId: string,
    role: string,
    permissions: string[] = []
  ) {
    try {
      const result = await DatabaseService.update("admin_roles", adminId, {
        role: role,
        permissions: permissions,
      });

      return result;
    } catch (error) {
      console.error("Error updating admin user:", error);
      throw error;
    }
  }

  // Remove admin user
  static async removeAdminUser(adminId: string) {
    try {
      await DatabaseService.delete("admin_roles", adminId);
      return true;
    } catch (error) {
      console.error("Error removing admin user:", error);
      throw error;
    }
  }

  // Get dashboard statistics
  static async getDashboardStats() {
    try {
      // Get sales stats
      const { data: salesStats, error: salesError } = await supabase.rpc(
        "get_dashboard_sales_stats"
      );

      // Get product stats
      const { data: productStats, error: productError } = await supabase.rpc(
        "get_dashboard_product_stats"
      );

      // Get customer stats
      const { data: customerStats, error: customerError } = await supabase.rpc(
        "get_dashboard_customer_stats"
      );

      // Get order stats
      const { data: orderStats, error: orderError } = await supabase.rpc(
        "get_dashboard_order_stats"
      );

      if (salesError || productError || customerError || orderError) {
        throw new Error("Failed to fetch dashboard stats");
      }

      return {
        sales: salesStats || {},
        products: productStats || {},
        customers: customerStats || {},
        orders: orderStats || {},
      };
    } catch (error) {
      console.error("Error getting dashboard stats:", error);
      throw error;
    }
  }

  // Get recent activity
  static async getRecentActivity(limit: number = 10) {
    try {
      // Get recent orders
      const { data: recentOrders, error: ordersError } = await supabase
        .from("orders")
        .select(
          `
          id,
          order_number,
          status,
          total_amount,
          created_at,
          user:profiles(name, email)
        `
        )
        .order("created_at", { ascending: false })
        .limit(limit);

      if (ordersError) throw ordersError;

      return recentOrders || [];
    } catch (error) {
      console.error("Error getting recent activity:", error);
      throw error;
    }
  }
}
