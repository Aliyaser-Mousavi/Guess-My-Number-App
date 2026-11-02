import { supabase } from "@/lib/supabase";
import type {
  AuthResult,
  DatabaseProfile,
  SignInParams,
  SignUpParams,
  UpdateProfileParams,
} from "@/types/auth";
import { Platform } from "react-native";

export class AuthService {
  /**
   * Generates the app's official deep link redirect URL according to app.json scheme.
   */
  static getRedirectUrl(route: "auth-callback" | "reset-password" = "auth-callback"): string {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      return `${window.location.origin}/${route}`;
    }
    // Mobile scheme configured in app.json ("scheme": "guessmynumber")
    return `guessmynumber://${route}`;
  }

  /**
   * Registers a new account with email, password, and player metadata.
   */
  static async signUp(params: SignUpParams): Promise<AuthResult> {
    try {
      const email = params.email.trim();
      const username = params.username.trim().toLowerCase();
      const displayName = params.displayName.trim();

      // 1. Validation
      if (!email || !email.includes("@")) {
        return { success: false, error: "Please enter a valid email address." };
      }
      if (params.password.length < 6) {
        return {
          success: false,
          error: "Password must be at least 6 characters long.",
        };
      }
      if (params.password !== params.passwordConfirmation) {
        return { success: false, error: "Passwords do not match." };
      }
      if (!username || !/^[a-z0-9_]{3,20}$/.test(username)) {
        return {
          success: false,
          error:
            "Username must be 3–20 characters and contain only lowercase letters, numbers, and underscores.",
        };
      }
      if (displayName.length < 2) {
        return {
          success: false,
          error: "Display name must be at least 2 characters.",
        };
      }

      // 2. Check username availability
      const available = await this.isUsernameAvailable(username);
      if (!available) {
        return {
          success: false,
          error: "This username is already taken. Please choose another.",
        };
      }

      // 3. Register user with Supabase Auth
      const redirectTo = this.getRedirectUrl("auth-callback");
      const { data, error } = await supabase.auth.signUp({
        email,
        password: params.password,
        options: {
          data: {
            username,
            display_name: displayName,
            avatar_id: params.avatarId ?? "oracle_orb",
            title_id: params.titleId ?? "apprentice_hunter",
          },
          emailRedirectTo: redirectTo,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: "Registration failed. Please try again." };
      }

      const requiresEmailConfirmation = !data.session;

      return {
        success: true,
        requiresEmailConfirmation,
        message: requiresEmailConfirmation
          ? "Account registered! Please check your email inbox to confirm your account."
          : "Account created successfully!",
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message ?? "An unexpected error occurred during registration.",
      };
    }
  }

  /**
   * Authenticates an existing user via email and password.
   */
  static async signIn(params: SignInParams): Promise<AuthResult> {
    try {
      const email = params.email.trim();
      if (!email || !email.includes("@")) {
        return { success: false, error: "Please enter a valid email address." };
      }
      if (!params.password) {
        return { success: false, error: "Please enter your password." };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: params.password,
      });

      if (error) {
        if (error.message.toLowerCase().includes("email not confirmed")) {
          return {
            success: false,
            error:
              "Your email address has not been verified yet. Please check your inbox for the confirmation email.",
          };
        }
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: "Login failed. Please check credentials." };
      }

      return { success: true, message: "Welcome back, Hunter!" };
    } catch (err: any) {
      return {
        success: false,
        error: err.message ?? "An unexpected login error occurred.",
      };
    }
  }

  /**
   * Securely terminates the authenticated user session.
   */
  static async signOut(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("[AuthService] Error during sign out:", err);
    }
  }

  /**
   * Requests a password recovery email with the app's configured redirect URL.
   */
  static async sendPasswordReset(email: string): Promise<AuthResult> {
    try {
      const trimmed = email.trim();
      if (!trimmed || !trimmed.includes("@")) {
        return { success: false, error: "Please enter a valid email address." };
      }

      const redirectTo = this.getRedirectUrl("reset-password");
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        message: "Password reset link sent! Please check your email inbox.",
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message ?? "Could not send password recovery email.",
      };
    }
  }

  /**
   * Updates the password for the currently authenticated or recovering session.
   */
  static async updatePassword(newPassword: string): Promise<AuthResult> {
    try {
      if (newPassword.length < 6) {
        return {
          success: false,
          error: "Password must be at least 6 characters long.",
        };
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        message: "Your password has been successfully updated!",
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message ?? "Failed to update password.",
      };
    }
  }

  /**
   * Fetches public player profile from the database.
   */
  static async fetchProfile(userId: string): Promise<DatabaseProfile | null> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error || !data) return null;
      return data as DatabaseProfile;
    } catch {
      return null;
    }
  }

  /**
   * Updates only permitted profile customization fields.
   * Progression (level, xp, rank) and system fields (id, username, created_at)
   * cannot be updated through this method.
   */
  static async updateProfile(
    userId: string,
    patch: UpdateProfileParams,
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", userId);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Fetches public player profile from the sanitized public_profiles view.
   */
  static async fetchPublicProfile(
    userId: string,
  ): Promise<Omit<DatabaseProfile, "updated_at"> | null> {
    try {
      const { data, error } = await supabase
        .from("public_profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error || !data) return null;
      return data as Omit<DatabaseProfile, "updated_at">;
    } catch {
      return null;
    }
  }

  /**
   * Checks if a requested username is already registered in the database.
   * Queries the public_profiles view so unauthenticated guests can check availability.
   */
  static async isUsernameAvailable(username: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from("public_profiles")
        .select("id")
        .eq("username", username.toLowerCase().trim())
        .maybeSingle();

      if (error) return true; // Fail open if view not yet created
      return !data;
    } catch {
      return true;
    }
  }

  /**
   * Parses and processes incoming auth redirect URLs (PKCE code or implicit hash tokens),
   * establishing active sessions for password recovery or email confirmation.
   */
  static async processAuthUrl(
    url: string,
  ): Promise<{ isRecovery: boolean; sessionRestored: boolean }> {
    try {
      if (!url) return { isRecovery: false, sessionRestored: false };

      const isRecovery =
        url.includes("reset-password") || url.includes("type=recovery");

      // 1. Check for PKCE authorization code in URL query or hash
      const codeMatch = url.match(/[?&#]code=([^&#]+)/);
      if (codeMatch && codeMatch[1]) {
        const code = decodeURIComponent(codeMatch[1]);
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          return { isRecovery, sessionRestored: true };
        }
      }

      // 2. Check for implicit hash tokens (#access_token=...&refresh_token=...)
      if (url.includes("#")) {
        const fragment = url.split("#")[1];
        const params = new URLSearchParams(fragment);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!error) {
            return { isRecovery, sessionRestored: true };
          }
        }
      }

      return { isRecovery, sessionRestored: false };
    } catch (err) {
      console.warn("[AuthService] Error processing auth link:", err);
      return { isRecovery: false, sessionRestored: false };
    }
  }
}
