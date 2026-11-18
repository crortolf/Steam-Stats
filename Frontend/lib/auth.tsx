"use client";

import axios from "axios";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { AuthUser } from "@/lib/types";

//withCredentials sends the session cookie with each request
const authApi = axios.create({
  baseURL: "http://localhost:5011/auth",
  withCredentials: true,
});

type Auth = {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>;
  saveSteamApiKey: (steamApiKey: string) => Promise<void>;
  // Accepts a Steam ID, profile URL or custom URL name.
  saveSteamId: (steamId: string) => Promise<void>;
};

const AuthContext = createContext<Auth | null>(null);

/**
 * Keeps track of who is signed in and shares it with every component below it,
 * through useAuth(). Loads the current user from the backend when the site
 * opens, and provides the sign in, sign up, sign out and account update actions.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    authApi
      .get<AuthUser>("/me", { signal: controller.signal })
      .then((res) => {
        setUser(res.data);
        setLoading(false);
      })
      .catch((err) => {
        if (!axios.isCancel(err)) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const auth: Auth = {
    user,
    loading,
    signIn: async (email, password) => {
      const res = await authApi.post<AuthUser>("/login", { email, password });
      setUser(res.data);
    },
    signUp: async (email, password) => {
      const res = await authApi.post<AuthUser>("/signup", { email, password });
      setUser(res.data);
    },
    signOut: async () => {
      await authApi.post("/logout");
      setUser(null);
    },
    changePassword: async (currentPassword, newPassword) => {
      await authApi.put("/password", { currentPassword, newPassword });
    },
    saveSteamApiKey: async (steamApiKey) => {
      const res = await authApi.put<AuthUser>("/steamApiKey", { steamApiKey });
      setUser(res.data);
    },
    saveSteamId: async (steamId) => {
      const res = await authApi.put<AuthUser>("/steamId", { steamId });
      setUser(res.data);
    },
  };

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (auth === null) throw new Error("useAuth needs an AuthProvider");
  return auth;
}

//the message the backend sent with a failed request, or the fallback
export function authErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error) && error.response?.data?.error) {
    return error.response.data.error as string;
  }
  return fallback;
}
