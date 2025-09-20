import { DatabaseService } from "$services/DatabaseService";
import { CartService } from "$services/CartService";
import { supabase } from "$lib/supabase";
import type {
  Cart,
  CartItem,
  CreateCartItemData,
  UpdateCartItemData,
  CartSummary,
  CartWithItems,
} from "$models/Cart";
import { writable } from "svelte/store";
import { browser } from "$app/environment";

// Store for cart data
export const cart = writable<Cart | null>(null);
export const cartItems = writable<CartItem[]>([]);
export const cartSummary = writable<CartSummary | null>(null);

export class CartController {
  private static sessionId: string | null = null;

  // Initialize session ID for guest users
  static initSessionId() {
    if (browser && !this.sessionId) {
      this.sessionId = localStorage.getItem("cart_session_id");
      if (!this.sessionId) {
        this.sessionId = crypto.randomUUID();
        localStorage.setItem("cart_session_id", this.sessionId);
      }
    }
  }

  // Get or create cart
  static async getOrCreateCart(): Promise<Cart> {
    try {
      this.initSessionId();

      const currentUser = await DatabaseService.getCurrentUser();
      const userId = currentUser?.id;

      // Try to find existing cart
      let query = supabase.from("carts").select(`
        *,
        items:cart_items(
          id,
          product_id,
          quantity,
          unit_price,
          total_price,
          product:products(
            id,
            name,
            sku,
            price,
            compare_at_price,
            featured_image,
            status,
            inventory:inventory(available)
          )
        )
      `);

      if (userId) {
        query = query.eq("user_id", userId);
      } else {
        query = query.eq("session_id", this.sessionId);
      }

      const { data: existingCart, error: findError } = await query.single();

      if (existingCart && !findError) {
        cart.set(existingCart);
        cartItems.set(existingCart.items || []);
        this.updateCartSummary(existingCart);
        return existingCart;
      }

      // Create new cart
      const cartData: any = {
        session_id: this.sessionId,
        currency: "USD",
        subtotal: 0,
        tax_amount: 0,
        shipping_amount: 0,
        discount_amount: 0,
        total_amount: 0,
      };

      if (userId) {
        cartData.user_id = userId;
      }

      const { data: newCart, error: createError } = await supabase
        .from("carts")
        .insert(cartData)
        .select(
          `
          *,
          items:cart_items(
            id,
            product_id,
            quantity,
            unit_price,
            total_price,
            product:products(
              id,
              name,
              sku,
              price,
              compare_at_price,
              featured_image,
              status,
              inventory:inventory(available)
            )
          )
        `
        )
        .single();

      if (createError) throw createError;

      cart.set(newCart);
      cartItems.set(newCart.items || []);
      this.updateCartSummary(newCart);

      return newCart;
    } catch (error) {
      console.error("Error getting or creating cart:", error);
      throw error;
    }
  }

  // Add item to cart
  static async addToCart(
    productId: string,
    quantity: number = 1
  ): Promise<CartItem> {
    try {
      const currentCart = await this.getOrCreateCart();

      // Check if item already exists in cart
      const existingItem = currentCart.items?.find(
        (item) => item.product_id === productId
      );

      if (existingItem) {
        // Update quantity
        return await this.updateCartItem(
          existingItem.id,
          existingItem.quantity + quantity
        );
      }

      // Get product details
      const { data: product, error: productError } = await supabase
        .from("products")
        .select(
          `
          id,
          name,
          sku,
          price,
          compare_at_price,
          featured_image,
          status,
          inventory:inventory(available)
        `
        )
        .eq("id", productId)
        .single();

      if (productError || !product) {
        throw new Error("Product not found");
      }

      if (product.status !== "active") {
        throw new Error("Product is not available");
      }

      // Check inventory
      if (
        product.inventory?.available !== undefined &&
        product.inventory.available < quantity
      ) {
        throw new Error("Insufficient inventory");
      }

      // Create cart item
      const cartItemData = {
        cart_id: currentCart.id,
        product_id: productId,
        quantity,
        unit_price: product.price,
        total_price: product.price * quantity,
      };

      const { data: cartItem, error: itemError } = await supabase
        .from("cart_items")
        .insert(cartItemData)
        .select(
          `
          id,
          product_id,
          quantity,
          unit_price,
          total_price,
          product:products(
            id,
            name,
            sku,
            price,
            compare_at_price,
            featured_image,
            status,
            inventory:inventory(available)
          )
        `
        )
        .single();

      if (itemError) throw itemError;

      // Refresh cart
      await this.getOrCreateCart();

      return cartItem;
    } catch (error) {
      console.error("Error adding to cart:", error);
      throw error;
    }
  }

  // Update cart item quantity
  static async updateCartItem(
    cartItemId: string,
    quantity: number
  ): Promise<CartItem> {
    try {
      if (quantity <= 0) {
        return await this.removeCartItem(cartItemId);
      }

      // Get current cart item
      const { data: currentItem, error: fetchError } = await supabase
        .from("cart_items")
        .select(
          `
          id,
          product_id,
          quantity,
          unit_price,
          product:products(
            id,
            inventory:inventory(available)
          )
        `
        )
        .eq("id", cartItemId)
        .single();

      if (fetchError || !currentItem) {
        throw new Error("Cart item not found");
      }

      // Check inventory
      if (
        currentItem.product?.inventory?.available !== undefined &&
        currentItem.product.inventory.available < quantity
      ) {
        throw new Error("Insufficient inventory");
      }

      // Update cart item
      const { data: updatedItem, error: updateError } = await supabase
        .from("cart_items")
        .update({
          quantity,
          total_price: currentItem.unit_price * quantity,
        })
        .eq("id", cartItemId)
        .select(
          `
          id,
          product_id,
          quantity,
          unit_price,
          total_price,
          product:products(
            id,
            name,
            sku,
            price,
            compare_at_price,
            featured_image,
            status,
            inventory:inventory(available)
          )
        `
        )
        .single();

      if (updateError) throw updateError;

      // Refresh cart
      await this.getOrCreateCart();

      return updatedItem;
    } catch (error) {
      console.error("Error updating cart item:", error);
      throw error;
    }
  }

  // Remove item from cart
  static async removeCartItem(cartItemId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("id", cartItemId);

      if (error) throw error;

      // Refresh cart
      await this.getOrCreateCart();
    } catch (error) {
      console.error("Error removing cart item:", error);
      throw error;
    }
  }

  // Clear cart
  static async clearCart(): Promise<void> {
    try {
      const currentCart = await this.getOrCreateCart();

      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("cart_id", currentCart.id);

      if (error) throw error;

      // Refresh cart
      await this.getOrCreateCart();
    } catch (error) {
      console.error("Error clearing cart:", error);
      throw error;
    }
  }

  // Get cart item count
  static getCartItemCount(): number {
    let count = 0;
    cartItems.subscribe((items) => {
      count = items.reduce((sum, item) => sum + item.quantity, 0);
    });
    return count;
  }

  // Calculate cart summary
  private static updateCartSummary(cartData: Cart): void {
    const itemCount =
      cartData.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    const subtotal =
      cartData.items?.reduce((sum, item) => sum + item.total_price, 0) || 0;

    const summary: CartSummary = {
      item_count: itemCount,
      subtotal: subtotal,
      tax_amount: cartData.tax_amount,
      shipping_amount: cartData.shipping_amount,
      discount_amount: cartData.discount_amount,
      total_amount: cartData.total_amount,
    };

    cartSummary.set(summary);
  }

  // Merge guest cart with user cart on login
  static async mergeGuestCart(): Promise<void> {
    try {
      const currentUser = await DatabaseService.getCurrentUser();
      if (!currentUser || !this.sessionId) return;

      // Get guest cart
      const { data: guestCart, error: guestError } = await supabase
        .from("carts")
        .select(
          `
          *,
          items:cart_items(
            id,
            product_id,
            quantity,
            unit_price,
            total_price
          )
        `
        )
        .eq("session_id", this.sessionId)
        .single();

      if (guestError || !guestCart) return;

      // Get user cart
      const { data: userCart, error: userError } = await supabase
        .from("carts")
        .select(
          `
          *,
          items:cart_items(
            id,
            product_id,
            quantity,
            unit_price,
            total_price
          )
        `
        )
        .eq("user_id", currentUser.id)
        .single();

      if (userError && userError.code !== "PGRST116") {
        throw userError;
      }

      if (userCart) {
        // Merge items
        for (const guestItem of guestCart.items || []) {
          const existingItem = userCart.items?.find(
            (item) => item.product_id === guestItem.product_id
          );

          if (existingItem) {
            // Update quantity
            await this.updateCartItem(
              existingItem.id,
              existingItem.quantity + guestItem.quantity
            );
          } else {
            // Add new item
            await this.addToCart(guestItem.product_id, guestItem.quantity);
          }
        }
      } else {
        // Transfer guest cart to user
        await supabase
          .from("carts")
          .update({ user_id: currentUser.id, session_id: null })
          .eq("id", guestCart.id);
      }

      // Delete guest cart
      await supabase.from("carts").delete().eq("session_id", this.sessionId);

      // Refresh cart
      await this.getOrCreateCart();
    } catch (error) {
      console.error("Error merging guest cart:", error);
      throw error;
    }
  }

  // Apply discount to cart
  static async applyDiscount(discountCode: string): Promise<void> {
    try {
      const currentCart = await this.getOrCreateCart();

      // Validate discount code (this would integrate with DiscountController)
      // For now, we'll just update the discount amount

      const { error } = await supabase
        .from("carts")
        .update({ discount_amount: 0 }) // This would be calculated based on discount
        .eq("id", currentCart.id);

      if (error) throw error;

      // Refresh cart
      await this.getOrCreateCart();
    } catch (error) {
      console.error("Error applying discount:", error);
      throw error;
    }
  }

  // Calculate shipping
  static async calculateShipping(address: any): Promise<number> {
    try {
      // This would integrate with shipping calculation logic
      // For now, return a fixed shipping cost
      return 9.99;
    } catch (error) {
      console.error("Error calculating shipping:", error);
      return 0;
    }
  }

  // Convert cart to order
  static async convertToOrder(
    shippingAddress: any,
    billingAddress: any
  ): Promise<string> {
    try {
      const currentCart = await this.getOrCreateCart();

      if (!currentCart.items || currentCart.items.length === 0) {
        throw new Error("Cart is empty");
      }

      // Create order (this would integrate with OrderController)
      // For now, return a placeholder order ID
      return "ORDER_PLACEHOLDER";
    } catch (error) {
      console.error("Error converting cart to order:", error);
      throw error;
    }
  }

  // Get current cart (supports both guest and authenticated users)
  static async getCurrentCart(): Promise<CartWithItems | null> {
    try {
      const currentUser = await DatabaseService.getCurrentUser();

      if (currentUser) {
        // Authenticated user - get from database
        return await this.getAuthenticatedCart();
      } else {
        // Guest user - get from localStorage
        return await CartService.getGuestCartWithProducts();
      }
    } catch (error) {
      console.error("Error getting current cart:", error);
      return null;
    }
  }

  // Get authenticated user's cart
  private static async getAuthenticatedCart(): Promise<CartWithItems | null> {
    try {
      const currentUser = await DatabaseService.getCurrentUser();
      if (!currentUser) return null;

      const { data, error } = await supabase
        .from("carts")
        .select(
          `
          *,
          items:cart_items(
            id,
            cart_id,
            product_id,
            quantity,
            price,
            created_at,
            updated_at,
            product:products(
              id,
              name,
              slug,
              sku,
              price,
              compare_at_price,
              featured_image,
              brand,
              status,
              inventory:inventory(available, low_stock_threshold)
            )
          )
        `
        )
        .eq("user_id", currentUser.id)
        .eq("status", "active")
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    } catch (error) {
      console.error("Error getting authenticated cart:", error);
      return null;
    }
  }

  // Add item to cart (supports both guest and authenticated users)
  static async addItem(itemData: CreateCartItemData): Promise<void> {
    try {
      const currentUser = await DatabaseService.getCurrentUser();

      if (currentUser) {
        // Authenticated user - add to database
        await this.addToCart(itemData.product_id, itemData.quantity);
      } else {
        // Guest user - add to localStorage
        CartService.addToGuestCart(
          itemData.product_id,
          itemData.quantity,
          itemData.price
        );
      }
    } catch (error) {
      console.error("Error adding item to cart:", error);
      throw error;
    }
  }

  // Update item quantity (supports both guest and authenticated users)
  static async updateItemQuantity(
    itemId: string,
    quantity: number
  ): Promise<void> {
    try {
      const currentUser = await DatabaseService.getCurrentUser();

      if (currentUser) {
        // Authenticated user - update in database
        await this.updateCartItem(itemId, quantity);
      } else {
        // Guest user - update in localStorage
        CartService.updateGuestCartItem(itemId, quantity);
      }
    } catch (error) {
      console.error("Error updating item quantity:", error);
      throw error;
    }
  }

  // Remove item from cart (supports both guest and authenticated users)
  static async removeItem(itemId: string): Promise<void> {
    try {
      const currentUser = await DatabaseService.getCurrentUser();

      if (currentUser) {
        // Authenticated user - remove from database
        await this.removeCartItem(itemId);
      } else {
        // Guest user - remove from localStorage
        CartService.removeFromGuestCart(itemId);
      }
    } catch (error) {
      console.error("Error removing item from cart:", error);
      throw error;
    }
  }

  // Clear cart (supports both guest and authenticated users)
  static async clearCart(): Promise<void> {
    try {
      const currentUser = await DatabaseService.getCurrentUser();

      if (currentUser) {
        // Authenticated user - clear database cart
        await this.clearCart();
      } else {
        // Guest user - clear localStorage cart
        CartService.clearGuestCart();
      }
    } catch (error) {
      console.error("Error clearing cart:", error);
      throw error;
    }
  }

  // Merge guest cart with user cart on login
  static async mergeGuestCartOnLogin(): Promise<void> {
    try {
      const currentUser = await DatabaseService.getCurrentUser();
      if (!currentUser) return;

      const guestCart = await CartService.getGuestCartWithProducts();
      if (!guestCart || !guestCart.items.length) return;

      const userCart = await this.getAuthenticatedCart();

      if (userCart) {
        // Merge items
        const mergedItems = await CartService.mergeGuestCartWithUserCart(
          userCart
        );

        // Update database with merged items
        for (const item of mergedItems) {
          if (!item.id) {
            // New item - add to database
            await this.addToCart(item.product_id, item.quantity);
          } else {
            // Existing item - update quantity
            await this.updateCartItem(item.id, item.quantity);
          }
        }
      } else {
        // Create new user cart with guest items
        const cartData = {
          user_id: currentUser.id,
          session_id: null,
          status: "active",
          subtotal: guestCart.subtotal,
          tax: guestCart.tax,
          shipping: guestCart.shipping,
          total: guestCart.total,
        };

        const { data: newCart, error } = await supabase
          .from("carts")
          .insert(cartData)
          .select()
          .single();

        if (error) throw error;

        // Add items to new cart
        for (const item of guestCart.items) {
          await this.addToCart(item.product_id, item.quantity);
        }
      }

      // Clear guest cart
      CartService.clearGuestCart();
    } catch (error) {
      console.error("Error merging guest cart on login:", error);
      throw error;
    }
  }

  // Get cart item count (supports both guest and authenticated users)
  static getItemCount(): number {
    try {
      const currentUser = DatabaseService.getCurrentUser();

      if (currentUser) {
        // Authenticated user - get from store
        return this.getCartItemCount();
      } else {
        // Guest user - get from localStorage
        return CartService.getCartItemCount();
      }
    } catch (error) {
      console.error("Error getting cart item count:", error);
      return 0;
    }
  }
}
