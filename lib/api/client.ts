/**
 * Standardized API client for Pulse
 * Provides consistent error handling and request/response types
 */

export interface ApiError {
  ok: false;
  error: string;
  status?: number;
}

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

class PulseApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = "") {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${url}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          ok: false,
          error: data?.error || `HTTP ${response.status}`,
          status: response.status,
        };
      }

      return {
        ok: true,
        data: data as T,
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Network error",
      };
    }
  }

  async get<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...options, method: "GET" });
  }

  async post<T>(url: string, body?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(url: string, body?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...options, method: "DELETE" });
  }
}

export const apiClient = new PulseApiClient();

/**
 * Convenience functions for common patterns
 */
export async function apiGet<T>(url: string): Promise<ApiResponse<T>> {
  return apiClient.get<T>(url);
}

export async function apiPost<T>(url: string, body?: unknown): Promise<ApiResponse<T>> {
  return apiClient.post<T>(url, body);
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<ApiResponse<T>> {
  return apiClient.patch<T>(url, body);
}

export async function apiDelete<T>(url: string): Promise<ApiResponse<T>> {
  return apiClient.delete<T>(url);
}

