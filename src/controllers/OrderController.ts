import { DatabaseService } from "$services/DatabaseService";
import { supabase } from "$lib/supabase";
import type {
  Order,
  CreateOrderData,
  UpdateOrderData,
  OrderWithDetails,
  OrderSummary,
} from "$models/Order";
import { writable } from "svelte/store";

// Store for orders
export const orders = writable<OrderWithDetails[]>([]);
export const currentOrder = writable<OrderWithDetails | null>(null);
export const orderSummary = writable<OrderSummary | null>(null);

export class OrderController {
  // Create a new order
  static async createOrder(orderData: CreateOrderData) {
    try {
      // Generate order number
      const orderNumber = await this.generateOrderNumber();

      // Create order
      const order = await DatabaseService.create("orders", {
        ...orderData,
        order_number: orderNumber,
        currency: orderData.currency || "USD",
        tax_amount: orderData.tax_amount || 0,
        shipping_amount: orderData.shipping_amount || 0,
        discount_amount: orderData.discount_amount || 0,
      });

      // Create order items
      for (const item of orderData.items) {
        await DatabaseService.create("order_items", {
          ...item,
          order_id: order.id,
        });
      }

      // Refresh orders list
      await this.getAllOrders();

      return order;
    } catch (error) {
      console.error("Error creating order:", error);
      throw error;
    }
  }

  // Get all orders with details
  static async getAllOrders() {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          user:profiles(id, name, email),
          items:order_items(
            id,
            product_id,
            quantity,
            unit_price,
            total_price,
            product_name,
            product_sku,
            product_image
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      orders.set(data as OrderWithDetails[]);
      return data;
    } catch (error) {
      console.error("Error getting orders:", error);
      throw error;
    }
  }

  // Get order by ID with full details
  static async getOrderById(orderId: string) {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          user:profiles(id, name, email),
          items:order_items(
            id,
            product_id,
            quantity,
            unit_price,
            total_price,
            product_name,
            product_sku,
            product_image,
            product:products(id, name, slug)
          )
        `
        )
        .eq("id", orderId)
        .single();

      if (error) throw error;

      currentOrder.set(data as OrderWithDetails);
      return data;
    } catch (error) {
      console.error("Error getting order by ID:", error);
      throw error;
    }
  }

  // Update order
  static async updateOrder(orderId: string, updateData: UpdateOrderData) {
    try {
      const result = await DatabaseService.update(
        "orders",
        orderId,
        updateData
      );

      // Refresh orders list and current order
      await this.getAllOrders();
      if (currentOrder) {
        await this.getOrderById(orderId);
      }

      return result;
    } catch (error) {
      console.error("Error updating order:", error);
      throw error;
    }
  }

  // Delete order
  static async deleteOrder(orderId: string) {
    try {
      await DatabaseService.delete("orders", orderId);

      // Refresh orders list
      await this.getAllOrders();
      currentOrder.set(null);

      return true;
    } catch (error) {
      console.error("Error deleting order:", error);
      throw error;
    }
  }

  // Get orders by status
  static async getOrdersByStatus(status: string) {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          user:profiles(id, name, email),
          items:order_items(
            id,
            product_id,
            quantity,
            unit_price,
            total_price,
            product_name,
            product_sku,
            product_image
          )
        `
        )
        .eq("status", status)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data as OrderWithDetails[];
    } catch (error) {
      console.error("Error getting orders by status:", error);
      throw error;
    }
  }

  // Get orders by user
  static async getOrdersByUser(userId: string) {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          user:profiles(id, name, email),
          items:order_items(
            id,
            product_id,
            quantity,
            unit_price,
            total_price,
            product_name,
            product_sku,
            product_image
          )
        `
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data as OrderWithDetails[];
    } catch (error) {
      console.error("Error getting orders by user:", error);
      throw error;
    }
  }

  // Get orders by date range
  static async getOrdersByDateRange(startDate: string, endDate: string) {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          user:profiles(id, name, email),
          items:order_items(
            id,
            product_id,
            quantity,
            unit_price,
            total_price,
            product_name,
            product_sku,
            product_image
          )
        `
        )
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data as OrderWithDetails[];
    } catch (error) {
      console.error("Error getting orders by date range:", error);
      throw error;
    }
  }

  // Generate unique order number
  static async generateOrderNumber(): Promise<string> {
    try {
      const { data, error } = await supabase.rpc("generate_order_number");

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error generating order number:", error);
      // Fallback to manual order number generation
      return "OR" + Date.now().toString().slice(-6);
    }
  }

  // Get order summary statistics
  static async getOrderSummary() {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("status, total_amount, created_at");

      if (error) throw error;

      const totalOrders = data.length;
      const totalRevenue = data.reduce(
        (sum, order) => sum + order.total_amount,
        0
      );
      const pendingOrders = data.filter(
        (order) => order.status === "pending"
      ).length;
      const completedOrders = data.filter(
        (order) => order.status === "delivered"
      ).length;
      const averageOrderValue =
        totalOrders > 0 ? totalRevenue / totalOrders : 0;

      const summary = {
        total_orders: totalOrders,
        total_revenue: totalRevenue,
        pending_orders: pendingOrders,
        completed_orders: completedOrders,
        average_order_value: averageOrderValue,
      };

      orderSummary.set(summary);
      return summary;
    } catch (error) {
      console.error("Error getting order summary:", error);
      throw error;
    }
  }

  // Update order status
  static async updateOrderStatus(
    orderId: string,
    status: string,
    trackingNumber?: string
  ) {
    try {
      const updateData: UpdateOrderData = { status: status as any };

      if (trackingNumber) {
        updateData.tracking_number = trackingNumber;
      }

      if (status === "shipped") {
        updateData.shipped_at = new Date().toISOString();
      }

      if (status === "delivered") {
        updateData.delivered_at = new Date().toISOString();
      }

      return await this.updateOrder(orderId, updateData);
    } catch (error) {
      console.error("Error updating order status:", error);
      throw error;
    }
  }

  // Get order analytics
  static async getOrderAnalytics(startDate?: string, endDate?: string) {
    try {
      let query = supabase.from("orders").select("*");

      if (startDate) {
        query = query.gte("created_at", startDate);
      }

      if (endDate) {
        query = query.lte("created_at", endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Calculate analytics
      const totalOrders = data.length;
      const totalRevenue = data.reduce(
        (sum, order) => sum + order.total_amount,
        0
      );
      const averageOrderValue =
        totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Group by status
      const statusCounts = data.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Group by payment status
      const paymentStatusCounts = data.reduce((acc, order) => {
        acc[order.payment_status] = (acc[order.payment_status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalOrders,
        totalRevenue,
        averageOrderValue,
        statusCounts,
        paymentStatusCounts,
      };
    } catch (error) {
      console.error("Error getting order analytics:", error);
      throw error;
    }
  }

  // Export orders to CSV
  static async exportOrdersToCSV(startDate?: string, endDate?: string) {
    try {
      const orders = await this.getOrdersByDateRange(
        startDate || new Date(0).toISOString(),
        endDate || new Date().toISOString()
      );

      // Convert to CSV format
      const csvHeaders = [
        "Order Number",
        "Customer",
        "Email",
        "Status",
        "Payment Status",
        "Total Amount",
        "Created At",
        "Items",
      ];

      const csvRows = orders.map((order) => [
        order.order_number,
        order.user?.name || "",
        order.user?.email || "",
        order.status,
        order.payment_status,
        order.total_amount,
        order.created_at,
        order.items
          .map((item) => `${item.product_name} (${item.quantity})`)
          .join("; "),
      ]);

      return [csvHeaders, ...csvRows];
    } catch (error) {
      console.error("Error exporting orders to CSV:", error);
      throw error;
    }
  }
}
