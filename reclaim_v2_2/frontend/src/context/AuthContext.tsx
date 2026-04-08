import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api } from "../utils/api";

interface User {
  id: number;
  store_name: string;
  email: string;
  role: string;
  sender_name?: string;
  sender_email?: string;
  has_brevo: boolean;
  has_twilio: boolean;
  has_anthropic: boolean;
  customer_count: number;
  emails_sent: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (store_name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("reclaim_token"));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.me()
        .then(setUser)
        .catch(() => {
          localStorage.removeItem("reclaim_token");
          setToken(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const data = await api.login({ email, password });
    localStorage.setItem("reclaim_token", data.access_token);
    setToken(data.access_token);
    const me = await api.me();
    setUser(me);
  };

  const signup = async (store_name: string, email: string, password: string) => {
    const data = await api.signup({ store_name, email, password });
    localStorage.setItem("reclaim_token", data.access_token);
    setToken(data.access_token);
    const me = await api.me();
    setUser(me);
  };

  const logout = () => {
    localStorage.removeItem("reclaim_token");
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    const me = await api.me();
    setUser(me);
  };

  return (
    <AuthContext.Provider value={{
      user, token, isLoading, login, signup, logout, refreshUser,
      isAdmin: user?.role === "super_admin",
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
