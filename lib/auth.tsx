import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  clearSessionToken,
  fetchCurrentAccount,
  getSessionToken,
  loginAccount,
  logoutAccount,
  registerAccount,
  setSessionToken,
} from "./api";
import { UserProfile } from "./types";

/** Account authentication and profiles are managed by the MongoDB-backed API. */

interface AuthContextValue {
  isLoading: boolean;
  isConfigured: boolean;
  isAdmin: boolean;
  user: UserProfile | null;
  profile: UserProfile | null;
  login: (email: string, password: string) => Promise<void>;
  register: (
    fullName: string,
    email: string,
    password: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getSessionToken()
      .then((token) => (token ? fetchCurrentAccount() : null))
      .then((profile) => {
        if (active && profile) setUser(profile);
      })
      .catch((err) => {
        if (__DEV__)
          console.error("[auth] failed to restore MongoDB session:", err);
        return clearSessionToken();
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function applySession(
    response: Awaited<ReturnType<typeof loginAccount>>,
  ) {
    await setSessionToken(response.token);
    setUser(response.user);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      isConfigured: true,
      isAdmin: user?.role === "admin",
      user,
      profile: user,
      async login(email: string, password: string) {
        const response = await loginAccount(email, password);
        await applySession(response);
      },
      async register(fullName: string, email: string, password: string) {
        const response = await registerAccount(fullName, email, password);
        await applySession(response);
      },
      async logout() {
        try {
          await logoutAccount();
        } finally {
          await clearSessionToken();
          setUser(null);
        }
      },
    }),
    [isLoading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider.");
  return ctx;
}
