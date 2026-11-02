import { supabase } from "@/lib/supabase";
import { AuthService } from "@/services/auth/AuthService";
import type {
  AuthResult,
  DatabaseProfile,
  SignInParams,
  SignUpParams,
} from "@/types/auth";
import type { Session, User } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isGuest: boolean;
  dbProfile: DatabaseProfile | null;
  isRecoveryMode: boolean;
  clearRecoveryMode: () => void;
  signIn: (params: SignInParams) => Promise<AuthResult>;
  signUp: (params: SignUpParams) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<AuthResult>;
  updatePassword: (newPassword: string) => Promise<AuthResult>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbProfile, setDbProfile] = useState<DatabaseProfile | null>(null);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  // Fetch linked database profile
  const fetchDbProfile = useCallback(async (userId: string) => {
    const prof = await AuthService.fetchProfile(userId);
    setDbProfile(prof);
  }, []);

  // Initialize and restore existing session
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn("[AuthProvider] getSession error:", error.message);
        }

        if (isMounted) {
          setSession(data.session);
          setUser(data.session?.user ?? null);
          if (data.session?.user) {
            fetchDbProfile(data.session.user.id).catch(() => {});
          }
        }
      } catch (err) {
        console.error("[AuthProvider] Session restore error:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initAuth();

    // Listen for Auth state transitions (login, logout, token refresh, password recovery)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!isMounted) return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (event === "PASSWORD_RECOVERY") {
        setIsRecoveryMode(true);
      }

      if (nextSession?.user) {
        fetchDbProfile(nextSession.user.id).catch(() => {});
      } else {
        setDbProfile(null);
      }
    });

    // Handle deep links for password recovery and auth callbacks
    const handleUrl = (url: string) => {
      if (!url) return;
      AuthService.processAuthUrl(url)
        .then(({ isRecovery }) => {
          if (isMounted && isRecovery) {
            setIsRecoveryMode(true);
          }
        })
        .catch((err) => {
          console.warn("[AuthProvider] handleUrl error:", err);
        });
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    const linkSub = Linking.addEventListener("url", (e) => {
      handleUrl(e.url);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      linkSub.remove();
    };
  }, [fetchDbProfile]);

  const signIn = useCallback(async (params: SignInParams): Promise<AuthResult> => {
    const res = await AuthService.signIn(params);
    return res;
  }, []);

  const signUp = useCallback(async (params: SignUpParams): Promise<AuthResult> => {
    const res = await AuthService.signUp(params);
    return res;
  }, []);

  const signOut = useCallback(async () => {
    await AuthService.signOut();
    setUser(null);
    setSession(null);
    setDbProfile(null);
  }, []);

  const sendPasswordReset = useCallback(async (email: string): Promise<AuthResult> => {
    return AuthService.sendPasswordReset(email);
  }, []);

  const updatePassword = useCallback(
    async (newPassword: string): Promise<AuthResult> => {
      const res = await AuthService.updatePassword(newPassword);
      if (res.success) {
        setIsRecoveryMode(false);
      }
      return res;
    },
    [],
  );

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchDbProfile(user.id);
    }
  }, [fetchDbProfile, user]);

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      isGuest: !user,
      dbProfile,
      isRecoveryMode,
      clearRecoveryMode: () => setIsRecoveryMode(false),
      signIn,
      signUp,
      signOut,
      sendPasswordReset,
      updatePassword,
      refreshProfile,
    }),
    [
      user,
      session,
      loading,
      dbProfile,
      isRecoveryMode,
      signIn,
      signUp,
      signOut,
      sendPasswordReset,
      updatePassword,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
