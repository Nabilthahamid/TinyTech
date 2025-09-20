export interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product: {
    id: string;
    name: string;
    sku: string;
    price: number;
    compare_at_price?: number;
    featured_image?: string;
    status: string;
    inventory?: {
      available: number;
    };
  };
}

export interface Cart {
  id: string;
  user_id?: string;
  session_id?: string;
  items: CartItem[];
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCartItemData {
  product_id: string;
  quantity: number;
}

export interface UpdateCartItemData {
  quantity: number;
}

export interface CartSummary {
  item_count: number;
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  discount_amount: number;
  total_amount: number;
}

export interface ShippingMethod {
  id: string;
  name: string;
  description?: string;
  cost: number;
  estimated_days: string;
  is_available: boolean;
}

export interface TaxRate {
  id: string;
  name: string;
  rate: number;
  type: "percentage" | "fixed";
  applies_to: "all" | "categories" | "products";
  category_ids?: string[];
  product_ids?: string[];
}
