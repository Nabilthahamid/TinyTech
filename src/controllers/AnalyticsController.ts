import { DatabaseService } from "$services/DatabaseService";
import { supabase } from "$lib/supabase";
import type {
  SalesReport,
  SalesData,
  TopSellingProduct,
  UserActivity,
  RevenueChart,
  ProductPerformance,
  CategoryPerformance,
  InventoryReport,
  DashboardStats,
  AnalyticsFilter,
} from "$models/Analytics";
import { writable } from "svelte/store";

// Store for analytics data
export const dashboardStats = writable<DashboardStats | null>(null);
export const salesData = writable<SalesData[]>([]);
export const topSellingProducts = writable<TopSellingProduct[]>([]);
export const userActivity = writable<UserActivity[]>([]);
export const revenueChart = writable<RevenueChart | null>(null);

export class AnalyticsController {
  // Get dashboard statistics
  static async getDashboardStats(): Promise<DashboardStats> {
    try {
      // Get today's date range
      const today = new Date();
      const todayStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

      // Get this month's date range
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);

      // Get last month's date range for growth calculation
      const lastMonthStart = new Date(
        today.getFullYear(),
        today.getMonth() - 1,
        1
      );
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 1);

      // Today's sales
      const { data: todaySales, error: todaySalesError } = await supabase
        .from("orders")
        .select("total_amount")
        .gte("created_at", todayStart.toISOString())
        .lt("created_at", todayEnd.toISOString());

      // Today's orders
      const { data: todayOrders, error: todayOrdersError } = await supabase
        .from("orders")
        .select("id")
        .gte("created_at", todayStart.toISOString())
        .lt("created_at", todayEnd.toISOString());

      // This month's sales
      const { data: monthSales, error: monthSalesError } = await supabase
        .from("orders")
        .select("total_amount")
        .gte("created_at", monthStart.toISOString())
        .lt("created_at", monthEnd.toISOString());

      // This month's orders
      const { data: monthOrders, error: monthOrdersError } = await supabase
        .from("orders")
        .select("id")
        .gte("created_at", monthStart.toISOString())
        .lt("created_at", monthEnd.toISOString());

      // Last month's sales for growth calculation
      const { data: lastMonthSales, error: lastMonthSalesError } =
        await supabase
          .from("orders")
          .select("total_amount")
          .gte("created_at", lastMonthStart.toISOString())
          .lt("created_at", lastMonthEnd.toISOString());

      // Products stats
      const { data: productStats, error: productStatsError } = await supabase
        .from("products")
        .select("id, status");

      // Low stock products
      const { data: lowStockProducts, error: lowStockError } = await supabase
        .from("inventory")
        .select("available, low_stock_threshold")
        .lte("available", supabase.raw("low_stock_threshold"));

      // Customer stats
      const { data: customerStats, error: customerStatsError } = await supabase
        .from("profiles")
        .select("id, created_at");

      // Today's new customers
      const { data: todayCustomers, error: todayCustomersError } =
        await supabase
          .from("profiles")
          .select("id")
          .gte("created_at", todayStart.toISOString())
          .lt("created_at", todayEnd.toISOString());

      // This month's new customers
      const { data: monthCustomers, error: monthCustomersError } =
        await supabase
          .from("profiles")
          .select("id")
          .gte("created_at", monthStart.toISOString())
          .lt("created_at", monthEnd.toISOString());

      // Order status stats
      const { data: orderStats, error: orderStatsError } = await supabase
        .from("orders")
        .select("status, total_amount");

      if (
        todaySalesError ||
        todayOrdersError ||
        monthSalesError ||
        monthOrdersError ||
        lastMonthSalesError ||
        productStatsError ||
        lowStockError ||
        customerStatsError ||
        todayCustomersError ||
        monthCustomersError ||
        orderStatsError
      ) {
        throw new Error("Failed to fetch dashboard statistics");
      }

      // Calculate totals
      const todayRevenue =
        todaySales?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
      const todayOrdersCount = todayOrders?.length || 0;
      const monthRevenue =
        monthSales?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
      const monthOrdersCount = monthOrders?.length || 0;
      const lastMonthRevenue =
        lastMonthSales?.reduce((sum, order) => sum + order.total_amount, 0) ||
        0;

      // Calculate growth percentage
      const growthPercentage =
        lastMonthRevenue > 0
          ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
          : 0;

      // Calculate averages
      const averageOrderValue =
        monthOrdersCount > 0 ? monthRevenue / monthOrdersCount : 0;

      // Order status counts
      const pendingOrders =
        orderStats?.filter((order) => order.status === "pending").length || 0;
      const processingOrders =
        orderStats?.filter((order) => order.status === "processing").length ||
        0;
      const shippedOrders =
        orderStats?.filter((order) => order.status === "shipped").length || 0;

      const stats: DashboardStats = {
        sales: {
          today_revenue: todayRevenue,
          today_orders: todayOrdersCount,
          month_revenue: monthRevenue,
          month_orders: monthOrdersCount,
          growth_percentage: growthPercentage,
        },
        products: {
          total_products: productStats?.length || 0,
          active_products:
            productStats?.filter((p) => p.status === "active").length || 0,
          low_stock_products: lowStockProducts?.length || 0,
        },
        customers: {
          total_customers: customerStats?.length || 0,
          new_customers_today: todayCustomers?.length || 0,
          new_customers_month: monthCustomers?.length || 0,
        },
        orders: {
          pending_orders: pendingOrders,
          processing_orders: processingOrders,
          shipped_orders: shippedOrders,
          average_order_value: averageOrderValue,
        },
      };

      dashboardStats.set(stats);
      return stats;
    } catch (error) {
      console.error("Error getting dashboard stats:", error);
      throw error;
    }
  }

  // Get sales report
  static async getSalesReport(
    period: "daily" | "weekly" | "monthly" | "yearly",
    startDate?: string,
    endDate?: string
  ): Promise<SalesReport> {
    try {
      const now = new Date();
      let start: Date, end: Date;

      if (startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
      } else {
        switch (period) {
          case "daily":
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
            break;
          case "weekly":
            start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            end = now;
            break;
          case "monthly":
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            break;
          case "yearly":
            start = new Date(now.getFullYear(), 0, 1);
            end = new Date(now.getFullYear() + 1, 0, 1);
            break;
        }
      }

      // Get orders in date range
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select(
          `
          id,
          total_amount,
          created_at,
          status,
          user_id
        `
        )
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString());

      if (ordersError) throw ordersError;

      // Get order items for product count
      const orderIds = orders?.map((order) => order.id) || [];
      const { data: orderItems, error: orderItemsError } = await supabase
        .from("order_items")
        .select("quantity, order_id")
        .in("order_id", orderIds);

      if (orderItemsError) throw orderItemsError;

      // Calculate metrics
      const totalRevenue =
        orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
      const totalOrders = orders?.length || 0;
      const averageOrderValue =
        totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const totalProductsSold =
        orderItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;

      // Get unique customers
      const uniqueCustomers = new Set(orders?.map((order) => order.user_id))
        .size;
      const newCustomers =
        orders?.filter((order) => {
          // This would need to be calculated based on user registration date
          return true; // Simplified for now
        }).length || 0;

      const report: SalesReport = {
        period,
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        total_revenue: totalRevenue,
        total_orders: totalOrders,
        average_order_value: averageOrderValue,
        total_products_sold: totalProductsSold,
        new_customers: newCustomers,
        returning_customers: uniqueCustomers - newCustomers,
        conversion_rate: 0, // Would need more data to calculate
      };

      return report;
    } catch (error) {
      console.error("Error getting sales report:", error);
      throw error;
    }
  }

  // Get top selling products
  static async getTopSellingProducts(
    limit: number = 10,
    startDate?: string,
    endDate?: string
  ): Promise<TopSellingProduct[]> {
    try {
      let query = supabase.from("order_items").select(`
          product_id,
          quantity,
          total_price,
          unit_price,
          product:products(id, name, sku)
        `);

      if (startDate) {
        query = query.gte("created_at", startDate);
      }

      if (endDate) {
        query = query.lte("created_at", endDate);
      }

      const { data: orderItems, error } = await query;

      if (error) throw error;

      // Group by product and calculate totals
      const productMap = new Map();

      orderItems?.forEach((item) => {
        const productId = item.product_id;
        if (!productMap.has(productId)) {
          productMap.set(productId, {
            product_id: productId,
            product_name: item.product?.name || "Unknown Product",
            sku: item.product?.sku || "",
            total_sold: 0,
            total_revenue: 0,
            average_price: 0,
          });
        }

        const product = productMap.get(productId);
        product.total_sold += item.quantity;
        product.total_revenue += item.total_price;
      });

      // Calculate average price and sort
      const topProducts = Array.from(productMap.values())
        .map((product) => ({
          ...product,
          average_price:
            product.total_sold > 0
              ? product.total_revenue / product.total_sold
              : 0,
        }))
        .sort((a, b) => b.total_sold - a.total_sold)
        .slice(0, limit)
        .map((product, index) => ({
          ...product,
          rank: index + 1,
        }));

      topSellingProducts.set(topProducts);
      return topProducts;
    } catch (error) {
      console.error("Error getting top selling products:", error);
      throw error;
    }
  }

  // Get user activity
  static async getUserActivity(limit: number = 50): Promise<UserActivity[]> {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          user_id,
          total_amount,
          created_at,
          user:profiles(id, name, email, created_at)
        `
        )
        .order("created_at", { ascending: false })
        .limit(limit * 2); // Get more to account for grouping

      if (error) throw error;

      // Group by user
      const userMap = new Map();

      orders?.forEach((order) => {
        const userId = order.user_id;
        if (!userMap.has(userId)) {
          userMap.set(userId, {
            user_id: userId,
            user_name: order.user?.name || "Unknown User",
            user_email: order.user?.email || "",
            total_orders: 0,
            total_spent: 0,
            last_order_date: order.created_at,
            registration_date: order.user?.created_at || "",
            average_order_value: 0,
          });
        }

        const user = userMap.get(userId);
        user.total_orders += 1;
        user.total_spent += order.total_amount;
        if (order.created_at > user.last_order_date) {
          user.last_order_date = order.created_at;
        }
      });

      // Calculate average order value and sort
      const activities = Array.from(userMap.values())
        .map((user) => ({
          ...user,
          average_order_value:
            user.total_orders > 0 ? user.total_spent / user.total_orders : 0,
        }))
        .sort((a, b) => b.total_spent - a.total_spent)
        .slice(0, limit);

      userActivity.set(activities);
      return activities;
    } catch (error) {
      console.error("Error getting user activity:", error);
      throw error;
    }
  }

  // Get revenue chart data
  static async getRevenueChartData(days: number = 30): Promise<RevenueChart> {
    try {
      const endDate = new Date();
      const startDate = new Date(
        endDate.getTime() - days * 24 * 60 * 60 * 1000
      );

      const { data: orders, error } = await supabase
        .from("orders")
        .select("total_amount, created_at")
        .gte("created_at", startDate.toISOString())
        .lt("created_at", endDate.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Group by date
      const dateMap = new Map();
      const labels: string[] = [];
      const revenue: number[] = [];
      const orderCounts: number[] = [];

      // Initialize all dates
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const dateKey = date.toISOString().split("T")[0];
        dateMap.set(dateKey, { revenue: 0, orders: 0 });
        labels.push(
          date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        );
      }

      // Aggregate data
      orders?.forEach((order) => {
        const dateKey = order.created_at.split("T")[0];
        if (dateMap.has(dateKey)) {
          const dayData = dateMap.get(dateKey);
          dayData.revenue += order.total_amount;
          dayData.orders += 1;
        }
      });

      // Convert to arrays
      dateMap.forEach((data, dateKey) => {
        revenue.push(data.revenue);
        orderCounts.push(data.orders);
      });

      const chartData: RevenueChart = {
        labels,
        revenue,
        orders: orderCounts,
      };

      revenueChart.set(chartData);
      return chartData;
    } catch (error) {
      console.error("Error getting revenue chart data:", error);
      throw error;
    }
  }

  // Get product performance
  static async getProductPerformance(
    limit: number = 20
  ): Promise<ProductPerformance[]> {
    try {
      // Get product views
      const { data: views, error: viewsError } = await supabase
        .from("product_views")
        .select("product_id")
        .order("viewed_at", { ascending: false });

      // Get order items
      const { data: orderItems, error: orderItemsError } = await supabase.from(
        "order_items"
      ).select(`
          product_id,
          quantity,
          total_price,
          product:products(id, name)
        `);

      if (viewsError || orderItemsError)
        throw new Error("Failed to fetch product performance data");

      // Group views by product
      const viewMap = new Map();
      views?.forEach((view) => {
        viewMap.set(view.product_id, (viewMap.get(view.product_id) || 0) + 1);
      });

      // Group orders by product
      const orderMap = new Map();
      orderItems?.forEach((item) => {
        const productId = item.product_id;
        if (!orderMap.has(productId)) {
          orderMap.set(productId, {
            product_id: productId,
            product_name: item.product?.name || "Unknown Product",
            views: viewMap.get(productId) || 0,
            orders: 0,
            revenue: 0,
          });
        }

        const product = orderMap.get(productId);
        product.orders += item.quantity;
        product.revenue += item.total_price;
      });

      // Calculate conversion rate and sort
      const performances = Array.from(orderMap.values())
        .map((product) => ({
          ...product,
          conversion_rate:
            product.views > 0 ? (product.orders / product.views) * 100 : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, limit);

      return performances;
    } catch (error) {
      console.error("Error getting product performance:", error);
      throw error;
    }
  }

  // Get category performance
  static async getCategoryPerformance(): Promise<CategoryPerformance[]> {
    try {
      const { data: categories, error: categoriesError } = await supabase
        .from("categories")
        .select(
          `
          id,
          name,
          products:products(id)
        `
        )
        .eq("status", "active");

      const { data: orderItems, error: orderItemsError } = await supabase.from(
        "order_items"
      ).select(`
          quantity,
          total_price,
          unit_price,
          product:products(id, category_id)
        `);

      if (categoriesError || orderItemsError)
        throw new Error("Failed to fetch category performance data");

      // Group order items by category
      const categoryMap = new Map();

      categories?.forEach((category) => {
        categoryMap.set(category.id, {
          category_id: category.id,
          category_name: category.name,
          total_products: category.products?.length || 0,
          total_sold: 0,
          total_revenue: 0,
          average_price: 0,
        });
      });

      orderItems?.forEach((item) => {
        const categoryId = item.product?.category_id;
        if (categoryId && categoryMap.has(categoryId)) {
          const category = categoryMap.get(categoryId);
          category.total_sold += item.quantity;
          category.total_revenue += item.total_price;
        }
      });

      // Calculate average price
      const performances = Array.from(categoryMap.values())
        .map((category) => ({
          ...category,
          average_price:
            category.total_sold > 0
              ? category.total_revenue / category.total_sold
              : 0,
        }))
        .sort((a, b) => b.total_revenue - a.total_revenue);

      return performances;
    } catch (error) {
      console.error("Error getting category performance:", error);
      throw error;
    }
  }
}
