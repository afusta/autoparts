// =============================================================================
// API Client
// =============================================================================
// Client Axios configuré pour communiquer avec le backend NestJS
// =============================================================================

import axios, { AxiosError } from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Intercepteur pour ajouter le token JWT
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Intercepteur pour gérer les erreurs d'authentification
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// =============================================================================
// Auth API
// =============================================================================

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  companyName: string;
  role: "GARAGE" | "SUPPLIER";
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    companyName: string;
    role: string;
  };
}

export const authApi = {
  login: (data: LoginDto) => api.post<AuthResponse>("/auth/login", data),
  register: (data: RegisterDto) =>
    api.post<AuthResponse>("/auth/register", data),
  me: () => api.get<AuthResponse["user"]>("/auth/me"),
};

// =============================================================================
// Parts API
// =============================================================================

export interface Part {
  partId: string;
  reference: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  price: number;
  priceFormatted: string;
  stock: {
    quantity: number;
    available: number;
    isLow: boolean;
    isOutOfStock: boolean;
  };
  supplier: {
    id: string;
    name: string;
  };
  compatibleVehicles: Array<{
    brand: string;
    model: string;
    yearFrom: number;
    yearTo: number;
  }>;
}

export interface PartsSearchParams {
  search?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const partsApi = {
  search: (params: PartsSearchParams) =>
    api.get<PaginatedResponse<Part>>("/queries/parts", { params }),
  getById: (partId: string) => api.get<Part>(`/queries/parts/${partId}`),
  create: (data: Partial<Part>) => api.post("/parts", data),
  update: (partId: string, data: Partial<Part>) =>
    api.patch(`/parts/${partId}`, data),
};

// =============================================================================
// Orders API
// =============================================================================

export interface OrderLine {
  partId: string;
  partName: string;
  partReference: string;
  supplierName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  totalFormatted: string;
}

export interface Order {
  orderId: string;
  garage: {
    id: string;
    name: string;
  };
  lines: OrderLine[];
  status: string;
  total: number;
  totalFormatted: string;
  statusHistory: Array<{
    status: string;
    changedAt: string;
  }>;
  createdAt: string;
}

export interface CreateOrderDto {
  lines: Array<{
    partId: string;
    quantity: number;
  }>;
}

export const ordersApi = {
  getMyOrders: (params?: { status?: string; page?: number }) =>
    api.get<PaginatedResponse<Order>>("/queries/my-orders", { params }),
  getSupplierOrders: (params?: { status?: string; page?: number }) =>
    api.get<PaginatedResponse<Order>>("/queries/supplier-orders", { params }),
  create: (data: CreateOrderDto) => api.post("/orders", data),
  confirm: (orderId: string) => api.post(`/orders/${orderId}/confirm`),
  ship: (orderId: string) => api.post(`/orders/${orderId}/ship`),
  deliver: (orderId: string) => api.post(`/orders/${orderId}/deliver`),
  cancel: (orderId: string, reason: string) =>
    api.post(`/orders/${orderId}/cancel`, { reason }),
};
