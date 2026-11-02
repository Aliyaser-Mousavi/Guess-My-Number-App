import type { Session, User } from "@supabase/supabase-js";

export type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isGuest: boolean;
};

export type DatabaseProfile = {
  id: string;
  username: string;
  display_name: string;
  avatar_id: string;
  title_id?: string;
  level: number;
  xp: number;
  rank: string;
  created_at: string;
  updated_at: string;
};

/**
 * Strictly limited to player-permitted profile customization fields.
 * Server-authoritative fields (id, username, level, xp, rank, created_at)
 * cannot be passed to client updates.
 */
export type UpdateProfileParams = {
  display_name?: string;
  avatar_id?: string;
  title_id?: string;
};

export type SignUpParams = {
  email: string;
  password: string;
  passwordConfirmation: string;
  username: string;
  displayName: string;
  avatarId?: string;
  titleId?: string;
};

export type SignInParams = {
  email: string;
  password: string;
};

export type ResetPasswordParams = {
  email: string;
};

export type UpdatePasswordParams = {
  newPassword: string;
  passwordConfirmation: string;
};

export type AuthResult = {
  success: boolean;
  message?: string;
  error?: string;
  requiresEmailConfirmation?: boolean;
};
