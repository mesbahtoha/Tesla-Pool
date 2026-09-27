"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";

export type Role = "PASSENGER" | "DRIVER" | "BOTH";
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  walletPaisa: number;
}

interface AuthCtx {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (name: string, email: string, password: string, role: Role) => Promise<User>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const t = localStorage.getItem("tesla_token");
    if (!t) {
      setLoading(false);
      return;
    }
    setToken(t);
    api<{ user: User }>("/api/auth/me", { token: t })
      .then((r) => setUser(r.user))
      .catch(() => {
        localStorage.removeItem("tesla_token");
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function saveSession(t: string, u: User) {
    localStorage.setItem("tesla_token", t);
    setToken(t);
    setUser(u);
    return u;
  }

  async function login(email: string, password: string) {
    const r = await api<{ token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });
    return saveSession(r.token, r.user);
  }

  async function signup(name: string, email: string, password: string, role: Role) {
    const r = await api<{ token: string; user: User }>("/api/auth/signup", {
      method: "POST",
      body: { name, email, password, role },
    });
    return saveSession(r.token, r.user);
  }

  function logout() {
    localStorage.removeItem("tesla_token");
    setUser(null);
    setToken(null);
    router.push("/login");
  }

  async function refresh() {
    if (!token) return;
    const r = await api<{ user: User }>("/api/auth/me", { token });
    setUser(r.user);
  }

  return (
    <Ctx.Provider value={{ user, token, loading, login, signup, logout, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}

export function homeFor(role: Role): string {
  return role === "DRIVER" ? "/driver" : "/passenger";
}
