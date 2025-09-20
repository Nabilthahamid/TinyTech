import type { CartItem, CartWithItems } from "$models/Cart";
import type { ProductWithCategory } from "$models/Product";
import { ProductController } from "$controllers/ProductController";

export class CartService {
  private static readonly CART_STORAGE_KEY = "guest_cart";
  private static readonly CART_EXPIRY_DAYS = 30;

  /**
   * Get guest cart from localStorage
   */
  static getGuestCart(): CartItem[] {
    try {
      const cartData = localStorage.getItem(this.CART_STORAGE_KEY);
      if (!cartData) return [];

      const parsed = JSON.parse(cartData);

      // Check if cart has expired
      if (parsed.expiry && new Date() > new Date(parsed.expiry)) {
        this.clearGuestCart();
        return [];
      }

      return parsed.items || [];
    } catch (error) {
      console.error("Error loading guest cart:", error);
      this.clearGuestCart();
      return [];
    }
  }

  /**
   * Save guest cart to localStorage
   */
  static saveGuestCart(items: CartItem[]): void {
    try {
      const cartData = {
        items,
        expiry: new Date(
          Date.now() + this.CART_EXPIRY_DAYS * 24 * 60 * 60 * 1000
        ).toISOString(),
      };

      localStorage.setItem(this.CART_STORAGE_KEY, JSON.stringify(cartData));
    } catch (error) {
      console.error("Error saving guest cart:", error);
    }
  }

  /**
   * Add item to guest cart
   */
  static addToGuestCart(
    productId: string,
    quantity: number = 1,
    price: number
  ): void {
    const cart = this.getGuestCart();
    const existingItemIndex = cart.findIndex(
      (item) => item.product_id === productId
    );

    if (existingItemIndex >= 0) {
      // Update existing item
      cart[existingItemIndex].quantity += quantity;
    } else {
      // Add new item
      const newItem: CartItem = {
        id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        cart_id: "guest_cart",
        product_id: productId,
        quantity,
        price,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        product: null, // Will be populated when needed
      };
      cart.push(newItem);
    }

    this.saveGuestCart(cart);
    this.dispatchCartUpdate();
  }

  /**
   * Update item quantity in guest cart
   */
  static updateGuestCartItem(itemId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeFromGuestCart(itemId);
      return;
    }

    const cart = this.getGuestCart();
    const itemIndex = cart.findIndex((item) => item.id === itemId);

    if (itemIndex >= 0) {
      cart[itemIndex].quantity = quantity;
      cart[itemIndex].updated_at = new Date().toISOString();
      this.saveGuestCart(cart);
      this.dispatchCartUpdate();
    }
  }

  /**
   * Remove item from guest cart
   */
  static removeFromGuestCart(itemId: string): void {
    const cart = this.getGuestCart();
    const filteredCart = cart.filter((item) => item.id !== itemId);
    this.saveGuestCart(filteredCart);
    this.dispatchCartUpdate();
  }

  /**
   * Clear guest cart
   */
  static clearGuestCart(): void {
    localStorage.removeItem(this.CART_STORAGE_KEY);
    this.dispatchCartUpdate();
  }

  /**
   * Get guest cart with product details
   */
  static async getGuestCartWithProducts(): Promise<CartWithItems | null> {
    const cart = this.getGuestCart();
    if (cart.length === 0) return null;

    try {
      // Fetch product details for each cart item
      const itemsWithProducts = await Promise.all(
        cart.map(async (item) => {
          try {
            const product = await ProductController.getById(item.product_id);
            return {
              ...item,
              product: product as ProductWithCategory,
            };
          } catch (error) {
            console.error(`Error fetching product ${item.product_id}:`, error);
            return item;
          }
        })
      );

      // Filter out items with invalid products
      const validItems = itemsWithProducts.filter(
        (item) => item.product !== null
      );

      return {
        id: "guest_cart",
        user_id: null,
        session_id: this.getSessionId(),
        items: validItems,
        subtotal: this.calculateSubtotal(validItems),
        tax: 0,
        shipping: 0,
        total: this.calculateSubtotal(validItems),
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error loading guest cart with products:", error);
      return null;
    }
  }

  /**
   * Merge guest cart with user cart
   */
  static async mergeGuestCartWithUserCart(
    userCart: CartWithItems
  ): Promise<CartItem[]> {
    const guestCart = this.getGuestCart();
    if (guestCart.length === 0) return userCart.items || [];

    const mergedItems: CartItem[] = [...(userCart.items || [])];

    for (const guestItem of guestCart) {
      const existingItemIndex = mergedItems.findIndex(
        (item) => item.product_id === guestItem.product_id
      );

      if (existingItemIndex >= 0) {
        // Merge quantities
        mergedItems[existingItemIndex].quantity += guestItem.quantity;
        mergedItems[existingItemIndex].updated_at = new Date().toISOString();
      } else {
        // Add guest item to user cart
        const newItem: CartItem = {
          ...guestItem,
          cart_id: userCart.id,
          id: undefined, // Will be assigned by database
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        mergedItems.push(newItem);
      }
    }

    // Clear guest cart after merge
    this.clearGuestCart();

    return mergedItems;
  }

  /**
   * Calculate subtotal
   */
  private static calculateSubtotal(items: CartItem[]): number {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  /**
   * Generate or get session ID
   */
  private static getSessionId(): string {
    let sessionId = sessionStorage.getItem("session_id");
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      sessionStorage.setItem("session_id", sessionId);
    }
    return sessionId;
  }

  /**
   * Dispatch cart update event
   */
  private static dispatchCartUpdate(): void {
    const event = new CustomEvent("cartUpdated");
    window.dispatchEvent(event);
  }

  /**
   * Get cart item count
   */
  static getCartItemCount(): number {
    const cart = this.getGuestCart();
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }

  /**
   * Check if item exists in guest cart
   */
  static isItemInGuestCart(productId: string): boolean {
    const cart = this.getGuestCart();
    return cart.some((item) => item.product_id === productId);
  }

  /**
   * Get item quantity in guest cart
   */
  static getGuestCartItemQuantity(productId: string): number {
    const cart = this.getGuestCart();
    const item = cart.find((item) => item.product_id === productId);
    return item ? item.quantity : 0;
  }
}
