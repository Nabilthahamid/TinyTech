import { DatabaseService } from "$services/DatabaseService";
import { CartController } from "$controllers/CartController";
import { supabase } from "$lib/supabase";
import type { User, CreateUserData, UpdateUserData } from "$models/User";
import { writable } from "svelte/store";

// Store for current user state
export const currentUser = writable<User | null>(null);

export class UserController {
  // Create a new user account
  static async createUser(userData: CreateUserData) {
    try {
      const result = await DatabaseService.signUp(
        userData.email,
        userData.password
      );

      if (result.user) {
        // Update user profile if name is provided
        if (userData.name) {
          await DatabaseService.update("profiles", result.user.id, {
            name: userData.name,
          });
        }

        currentUser.set(result.user as User);
        return result.user;
      }

      throw new Error("Failed to create user");
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  // Sign in user
  static async signIn(email: string, password: string) {
    try {
      const result = await DatabaseService.signIn(email, password);

      if (result.user) {
        currentUser.set(result.user as User);

        // Merge guest cart with user cart on login
        try {
          await CartController.mergeGuestCartOnLogin();
        } catch (cartError) {
          console.error("Error merging guest cart:", cartError);
          // Don't throw error - login should still succeed even if cart merge fails
        }

        return result.user;
      }

      throw new Error("Failed to sign in");
    } catch (error) {
      console.error("Error signing in:", error);
      throw error;
    }
  }

  // Sign in with Google
  static async signInWithGoogle() {
    try {
      const result = await DatabaseService.signInWithGoogle();
      return result;
    } catch (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
  }

  // Sign out user
  static async signOut() {
    try {
      await DatabaseService.signOut();
      currentUser.set(null);
      return true;
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  }

  // Get current user
  static async getCurrentUser() {
    try {
      const user = await DatabaseService.getCurrentUser();
      currentUser.set(user as User);
      return user;
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  }

  // Update user profile
  static async updateProfile(userId: string, updateData: UpdateUserData) {
    try {
      const result = await DatabaseService.update(
        "profiles",
        userId,
        updateData
      );
      currentUser.set(result as User);
      return result;
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  }

  // Get user by ID
  static async getUserById(userId: string) {
    try {
      const user = await DatabaseService.read("profiles", userId);
      return user;
    } catch (error) {
      console.error("Error getting user by ID:", error);
      throw error;
    }
  }

  // Forgot password - send reset email
  static async forgotPassword(email: string) {
    try {
      const result = await DatabaseService.resetPassword(email);
      return result;
    } catch (error) {
      console.error("Error sending password reset email:", error);
      throw error;
    }
  }

  // Reset password with new password
  static async resetPassword(newPassword: string) {
    try {
      const result = await DatabaseService.updatePassword(newPassword);
      return result;
    } catch (error) {
      console.error("Error resetting password:", error);
      throw error;
    }
  }

  // Change password (for authenticated users)
  static async changePassword(currentPassword: string, newPassword: string) {
    try {
      // First verify current password by attempting to sign in
      const currentUser = await DatabaseService.getCurrentUser();
      if (!currentUser?.email) {
        throw new Error("No authenticated user found");
      }

      // Verify current password
      await DatabaseService.signIn(currentUser.email, currentPassword);

      // Update to new password
      const result = await DatabaseService.updatePassword(newPassword);
      return result;
    } catch (error) {
      console.error("Error changing password:", error);
      throw error;
    }
  }

  // Verify email address
  static async verifyEmail(token: string, type: string) {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: type as any,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error verifying email:", error);
      throw error;
    }
  }

  // Resend verification email
  static async resendVerification(email: string) {
    try {
      const { data, error } = await supabase.auth.resend({
        type: "signup",
        email: email,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error resending verification:", error);
      throw error;
    }
  }
}
