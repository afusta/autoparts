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

// Part from Query endpoints (MongoDB Read Model)
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
    reserved: number;
    available: number;
    isLow: boolean;
    isOutOfStock: boolean;
  };
  supplier: {
    id: string;
    name: string;
  };
  supplierId: string;
  compatibleVehicles: Array<{
    brand: string;
    model: string;
    yearFrom: number;
    yearTo: number;
    engine?: string;
  }>;
  isActive: boolean;
}

// Part from Command endpoints (domain entity response)
export interface PartCommandResponse {
  id: string;
  supplierId: string;
  reference: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  price: number;
  priceFormatted: string;
  stock: {
    quantity: number;
    reserved: number;
    available: number;
  };
  compatibleVehicles: Array<{
    brand: string;
    model: string;
    yearFrom: number;
    yearTo: number;
    engine?: string;
  }>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PartsSearchParams {
  search?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  page?: number;
  limit?: number;
}

export interface VehicleCompatibility {
  brand: string;
  model: string;
  yearFrom: number;
  yearTo: number;
  engine?: string;
}

export interface CreatePartDto {
  reference: string;
  name: string;
  description?: string;
  category: string;
  brand: string;
  price: number;
  initialStock: number;
  compatibleVehicles: VehicleCompatibility[];
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

export interface UpdatePartDto {
  name?: string;
  description?: string;
  category?: string;
  brand?: string;
  price?: number;
}

export interface PartDetail extends Part {
  frequentlyOrderedWith?: Array<{
    partId: string;
    name: string;
    reference: string;
    count: number;
  }>;
}

export const partsApi = {
  search: (params: PartsSearchParams) =>
    api.get<PaginatedResponse<Part>>("/queries/parts", { params }),
  getById: (partId: string) => api.get<PartDetail>(`/queries/parts/${partId}`),
  getMyParts: (params?: { page?: number; limit?: number }) =>
    api.get<PaginatedResponse<Part>>("/queries/my-parts", { params }),
  create: (data: CreatePartDto) => api.post<PartCommandResponse>("/parts", data),
  update: (partId: string, data: UpdatePartDto) =>
    api.put<PartCommandResponse>(`/parts/${partId}`, data),
  addStock: (partId: string, quantity: number) =>
    api.post<PartCommandResponse>(`/parts/${partId}/stock`, { quantity }),
};

// =============================================================================
// Orders API
// =============================================================================

// OrderLine from Query endpoints (MongoDB Read Model)
export interface OrderLine {
  partId: string;
  partName: string;
  partReference: string;
  supplierId: string;
  supplierName: string;
  quantity: number;
  unitPriceInCents: number;
  unitPrice: number;
  totalInCents: number;
  total: number;
  totalFormatted: string;
}

// Order from Query endpoints (MongoDB Read Model)
export interface Order {
  orderId: string;
  garage: {
    id: string;
    name: string;
  };
  lines: OrderLine[];
  supplierIds: string[];
  status: string;
  totalInCents: number;
  total: number;
  totalFormatted: string;
  notes?: string;
  cancelReason?: string;
  statusHistory: Array<{
    status: string;
    changedAt: string;
    changedBy?: string;
    reason?: string;
  }>;
  createdAt: string;
}

// OrderLine from Command endpoints
export interface OrderLineCommandResponse {
  partId: string;
  partName: string;
  partReference: string;
  supplierId: string;
  quantity: number;
  unitPrice: number;
  total: number;
  totalFormatted: string;
}

// Order from Command endpoints (domain entity response)
export interface OrderCommandResponse {
  id: string;
  garageId: string;
  garageName: string;
  lines: OrderLineCommandResponse[];
  status: string;
  total: number;
  totalFormatted: string;
  notes?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderDto {
  lines: Array<{
    partId: string;
    quantity: number;
  }>;
  notes?: string;
}

export const ordersApi = {
  getMyOrders: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get<PaginatedResponse<Order>>("/queries/my-orders", { params }),
  getSupplierOrders: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get<PaginatedResponse<Order>>("/queries/supplier-orders", { params }),
  create: (data: CreateOrderDto) => api.post<OrderCommandResponse>("/orders", data),
  confirm: (orderId: string) => api.post<OrderCommandResponse>(`/orders/${orderId}/confirm`),
  ship: (orderId: string) => api.post<OrderCommandResponse>(`/orders/${orderId}/ship`),
  deliver: (orderId: string) => api.post<OrderCommandResponse>(`/orders/${orderId}/deliver`),
  cancel: (orderId: string, reason: string) =>
    api.post<OrderCommandResponse>(`/orders/${orderId}/cancel`, { reason }),
};

// =============================================================================
// Analytics API (Admin)
// =============================================================================

export interface GraphStats {
  totalUsers: number;
  totalParts: number;
  totalOrders: number;
  totalVehicles: number;
  usersByRole: Record<string, number>;
}

export interface TopSupplier {
  supplierId: string;
  companyName: string;
  orderCount: number;
  totalSpent: number;
}

export const analyticsApi = {
  getGraphStats: () => api.get<GraphStats>("/queries/analytics/graph-stats"),
  getMyTopSuppliers: () =>
    api.get<TopSupplier[]>("/queries/analytics/my-top-suppliers"),
};
