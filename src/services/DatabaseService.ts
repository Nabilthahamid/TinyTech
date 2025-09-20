import { supabase } from "$lib/supabase";
import type { User } from "@supabase/supabase-js";

export class DatabaseService {
  // Generic CRUD operations
  static async create(table: string, data: any) {
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  static async read(table: string, id?: string | number) {
    let query = supabase.from(table).select("*");

    if (id) {
      query = query.eq("id", id);
      const { data, error } = await query.single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  }

  static async update(table: string, id: string | number, data: any) {
    const { data: result, error } = await supabase
      .from(table)
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  static async delete(table: string, id: string | number) {
    const { error } = await supabase.from(table).delete().eq("id", id);

    if (error) throw error;
    return true;
  }

  // Authentication methods
  static async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;
    return data;
  }

  static async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  }

  static async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
    });

    if (error) throw error;
    return data;
  }

  static async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return true;
  }

  static async getCurrentUser(): Promise<User | null> {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) {
      console.error("Error getting user:", error);
      return null;
    }
    return user;
  }

  // Password reset methods
  static async resetPassword(email: string) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) throw error;
    return data;
  }

  static async updatePassword(newPassword: string) {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
    return data;
  }

  // Generate password reset token (for custom implementation)
  static async generatePasswordResetToken(userId: string) {
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

    const { data, error } = await this.create("password_reset_tokens", {
      user_id: userId,
      token: token,
      expires_at: expiresAt.toISOString(),
    });

    if (error) throw error;
    return { token, expiresAt };
  }

  // Validate password reset token
  static async validatePasswordResetToken(token: string) {
    const { data, error } = await supabase
      .from("password_reset_tokens")
      .select("*")
      .eq("token", token)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (error) throw error;
    return data;
  }

  // Mark password reset token as used
  static async markTokenAsUsed(token: string) {
    const { data, error } = await supabase
      .from("password_reset_tokens")
      .update({ used: true })
      .eq("token", token)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Clean up expired tokens
  static async cleanupExpiredTokens() {
    const { error } = await supabase
      .from("password_reset_tokens")
      .delete()
      .lt("expires_at", new Date().toISOString());

    if (error) throw error;
    return true;
  }
}
