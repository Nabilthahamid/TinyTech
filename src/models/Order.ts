export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  status:
    | "pending"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "refunded";
  payment_status:
    | "pending"
    | "paid"
    | "failed"
    | "refunded"
    | "partially_refunded";
  payment_method: string;
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  shipping_address: Address;
  billing_address: Address;
  notes?: string;
  tracking_number?: string;
  shipped_at?: string;
  delivered_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Address {
  first_name: string;
  last_name: string;
  company?: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_name: string;
  product_sku: string;
  product_image?: string;
}

export interface CreateOrderData {
  user_id: string;
  status?:
    | "pending"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "refunded";
  payment_status?:
    | "pending"
    | "paid"
    | "failed"
    | "refunded"
    | "partially_refunded";
  payment_method: string;
  subtotal: number;
  tax_amount?: number;
  shipping_amount?: number;
  discount_amount?: number;
  total_amount: number;
  currency?: string;
  shipping_address: Address;
  billing_address: Address;
  notes?: string;
  items: Omit<OrderItem, "id" | "order_id">[];
}

export interface UpdateOrderData {
  status?:
    | "pending"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "refunded";
  payment_status?:
    | "pending"
    | "paid"
    | "failed"
    | "refunded"
    | "partially_refunded";
  tracking_number?: string;
  notes?: string;
  shipped_at?: string;
  delivered_at?: string;
}

export interface OrderWithDetails extends Order {
  user: {
    id: string;
    name: string;
    email: string;
  };
  items: OrderItem[];
}

export interface OrderSummary {
  total_orders: number;
  total_revenue: number;
  pending_orders: number;
  completed_orders: number;
  average_order_value: number;
}
