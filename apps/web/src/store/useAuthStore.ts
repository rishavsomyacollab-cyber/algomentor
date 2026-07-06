import { create } from "zustand";
import { api, setAccessToken } from "@/lib/api";
import type { User } from "@/lib/types";

const LS_KEY = "algomentor_logged_in";

// remember=true → localStorage (survives restart); false → sessionStorage (tab-only)
const markLoggedIn  = (remember = true) => {
  try {
    if (remember) { localStorage.setItem(LS_KEY, "1"); sessionStorage.removeItem(LS_KEY); }
    else          { sessionStorage.setItem(LS_KEY, "1"); localStorage.removeItem(LS_KEY); }
  } catch {}
};
const markLoggedOut = () => {
  try { localStorage.removeItem(LS_KEY); sessionStorage.removeItem(LS_KEY); } catch {}
};
const wasLoggedIn = () => {
  try { return !!localStorage.getItem(LS_KEY) || !!sessionStorage.getItem(LS_KEY); } catch { return false; }
};

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signup: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password, rememberMe = true) => {
    const res = await api.login(email, password);
    setAccessToken(res.access_token);
    markLoggedIn(rememberMe);
    set({ user: res.user, isAuthenticated: true });
  },

  signup: async (email, username, password) => {
    const res = await api.signup(email, username, password);
    setAccessToken(res.access_token);
    markLoggedIn();
    set({ user: res.user, isAuthenticated: true });
  },

  logout: async () => {
    try { await api.logout(); } catch { /* ignore */ }
    setAccessToken(null);
    markLoggedOut();
    set({ user: null, isAuthenticated: false });
  },

  hydrate: async () => {
    // If never logged in before, skip the refresh round-trip entirely.
    if (!wasLoggedIn()) {
      set({ isLoading: false });
      return;
    }
    try {
      const data = await api.refreshToken();
      setAccessToken(data.access_token);
      const user = await api.getMe();
      markLoggedIn();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      setAccessToken(null);
      markLoggedOut();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearAuth: () => {
    setAccessToken(null);
    markLoggedOut();
    set({ user: null, isAuthenticated: false });
  },
}));
