export interface Discount {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: "percentage" | "fixed_amount" | "free_shipping";
  value: number;
  minimum_amount?: number;
  maximum_discount?: number;
  usage_limit?: number;
  used_count: number;
  valid_from: string;
  valid_until: string;
  status: "active" | "inactive" | "expired";
  applies_to: "all" | "categories" | "products" | "users";
  categories?: string[];
  products?: string[];
  users?: string[];
  one_time_use: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateDiscountData {
  code: string;
  name: string;
  description?: string;
  type: "percentage" | "fixed_amount" | "free_shipping";
  value: number;
  minimum_amount?: number;
  maximum_discount?: number;
  usage_limit?: number;
  valid_from: string;
  valid_until: string;
  status?: "active" | "inactive" | "expired";
  applies_to?: "all" | "categories" | "products" | "users";
  categories?: string[];
  products?: string[];
  users?: string[];
  one_time_use?: boolean;
}

export interface UpdateDiscountData {
  code?: string;
  name?: string;
  description?: string;
  type?: "percentage" | "fixed_amount" | "free_shipping";
  value?: number;
  minimum_amount?: number;
  maximum_discount?: number;
  usage_limit?: number;
  valid_from?: string;
  valid_until?: string;
  status?: "active" | "inactive" | "expired";
  applies_to?: "all" | "categories" | "products" | "users";
  categories?: string[];
  products?: string[];
  users?: string[];
  one_time_use?: boolean;
}

export interface DiscountUsage {
  id: string;
  discount_id: string;
  order_id: string;
  user_id: string;
  amount_discounted: number;
  used_at: string;
}

export interface DiscountWithUsage extends Discount {
  usage: DiscountUsage[];
}

export interface DiscountStats {
  total_discounts: number;
  active_discounts: number;
  total_discounts_used: number;
  total_amount_discounted: number;
  most_used_discount: {
    id: string;
    code: string;
    used_count: number;
  };
}
