export interface Inventory {
  id: string;
  product_id: string;
  sku: string;
  quantity: number;
  reserved: number;
  available: number;
  low_stock_threshold: number;
  reorder_point: number;
  reorder_quantity: number;
  location?: string;
  bin_location?: string;
  notes?: string;
  last_counted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryTransaction {
  id: string;
  product_id: string;
  type: "in" | "out" | "adjustment" | "reserved" | "unreserved";
  quantity: number;
  reference_type: "order" | "adjustment" | "transfer" | "return";
  reference_id?: string;
  notes?: string;
  user_id?: string;
  created_at: string;
}

export interface CreateInventoryData {
  product_id: string;
  sku: string;
  quantity: number;
  reserved?: number;
  low_stock_threshold?: number;
  reorder_point?: number;
  reorder_quantity?: number;
  location?: string;
  bin_location?: string;
  notes?: string;
}

export interface UpdateInventoryData {
  quantity?: number;
  reserved?: number;
  low_stock_threshold?: number;
  reorder_point?: number;
  reorder_quantity?: number;
  location?: string;
  bin_location?: string;
  notes?: string;
}

export interface InventoryAdjustment {
  product_id: string;
  quantity_change: number;
  type: "in" | "out" | "adjustment";
  notes?: string;
}

export interface LowStockAlert {
  product_id: string;
  product_name: string;
  sku: string;
  current_quantity: number;
  low_stock_threshold: number;
  reorder_point: number;
}
