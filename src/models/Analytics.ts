export interface SalesReport {
  period: "daily" | "weekly" | "monthly" | "yearly";
  start_date: string;
  end_date: string;
  total_revenue: number;
  total_orders: number;
  average_order_value: number;
  total_products_sold: number;
  new_customers: number;
  returning_customers: number;
  conversion_rate: number;
}

export interface SalesData {
  date: string;
  revenue: number;
  orders: number;
  products_sold: number;
}

export interface TopSellingProduct {
  product_id: string;
  product_name: string;
  sku: string;
  total_sold: number;
  total_revenue: number;
  average_price: number;
  rank: number;
}

export interface UserActivity {
  user_id: string;
  user_name: string;
  user_email: string;
  total_orders: number;
  total_spent: number;
  last_order_date: string;
  registration_date: string;
  average_order_value: number;
}

export interface RevenueChart {
  labels: string[];
  revenue: number[];
  orders: number[];
}

export interface ProductPerformance {
  product_id: string;
  product_name: string;
  views: number;
  orders: number;
  revenue: number;
  conversion_rate: number;
}

export interface CategoryPerformance {
  category_id: string;
  category_name: string;
  total_products: number;
  total_sold: number;
  total_revenue: number;
  average_price: number;
}

export interface InventoryReport {
  total_products: number;
  low_stock_products: number;
  out_of_stock_products: number;
  total_inventory_value: number;
  average_stock_level: number;
}

export interface DashboardStats {
  sales: {
    today_revenue: number;
    today_orders: number;
    month_revenue: number;
    month_orders: number;
    growth_percentage: number;
  };
  products: {
    total_products: number;
    active_products: number;
    low_stock_products: number;
  };
  customers: {
    total_customers: number;
    new_customers_today: number;
    new_customers_month: number;
  };
  orders: {
    pending_orders: number;
    processing_orders: number;
    shipped_orders: number;
    average_order_value: number;
  };
}

export interface DateRange {
  start_date: string;
  end_date: string;
}

export interface AnalyticsFilter {
  date_range?: DateRange;
  category_id?: string;
  product_id?: string;
  customer_id?: string;
  status?: string;
}
