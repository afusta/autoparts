// =============================================================================
// Auth Store (Zustand)
// =============================================================================
// Gestion globale de l'état d'authentification
// =============================================================================

import { create } from 'zustand';
import { authApi, AuthResponse } from './api';

interface User {
  id: string;
  email: string;
  companyName: string;
  role: 'GARAGE' | 'SUPPLIER' | 'ADMIN';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    companyName: string,
    role: 'GARAGE' | 'SUPPLIER'
  ) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    const { accessToken, user } = response.data;

    localStorage.setItem('token', accessToken);
    set({
      token: accessToken,
      user: user as User,
      isAuthenticated: true,
    });
  },

  register: async (
    email: string,
    password: string,
    companyName: string,
    role: 'GARAGE' | 'SUPPLIER'
  ) => {
    const response = await authApi.register({ email, password, companyName, role });
    const { accessToken, user } = response.data;

    localStorage.setItem('token', accessToken);
    set({
      token: accessToken,
      user: user as User,
      isAuthenticated: true,
    });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({
      token: null,
      user: null,
      isAuthenticated: false,
    });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    try {
      const response = await authApi.me();
      set({
        user: response.data as User,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      localStorage.removeItem('token');
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));
