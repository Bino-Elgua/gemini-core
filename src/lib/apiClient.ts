/**
 * API Client - Centralized HTTP request handler
 */

const API_BASE = process.env.API_URL || 'http://localhost:4000';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
    this.loadToken();
  }

  private loadToken() {
    try {
      this.token = localStorage.getItem('auth_token');
    } catch (e) {
      console.warn('Could not load token from localStorage');
    }
  }

  setToken(token: string) {
    this.token = token;
    try {
      localStorage.setItem('auth_token', token);
    } catch (e) {
      console.warn('Could not save token to localStorage');
    }
  }

  clearToken() {
    this.token = null;
    try {
      localStorage.removeItem('auth_token');
    } catch (e) {
      console.warn('Could not clear token from localStorage');
    }
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  async request<T>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      body?: Record<string, any>;
      headers?: HeadersInit;
    } = {}
  ): Promise<ApiResponse<T>> {
    const { method = 'GET', body, headers = {} } = options;

    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          ...this.getHeaders(),
          ...headers
        },
        body: body ? JSON.stringify(body) : undefined
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(`API Error [${response.status}]:`, data);
        return {
          success: false,
          error: data.error || `Request failed with status ${response.status}`
        };
      }

      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('API Request Error:', message);
      return {
        success: false,
        error: message
      };
    }
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.request<{
      token: string;
      user: Record<string, any>;
    }>('/api/auth/login', {
      method: 'POST',
      body: { email, password }
    });

    if (response.success && response.data?.token) {
      this.setToken(response.data.token);
    }

    return response;
  }

  async logout() {
    this.clearToken();
    return this.request('/api/auth/logout', { method: 'POST' });
  }

  // Campaign endpoints
  async getCampaigns() {
    return this.request('/api/campaigns');
  }

  async getCampaign(id: string) {
    return this.request(`/api/campaigns/${id}`);
  }

  async createCampaign(data: Record<string, any>) {
    return this.request('/api/campaigns', {
      method: 'POST',
      body: data
    });
  }

  async updateCampaign(id: string, data: Record<string, any>) {
    return this.request(`/api/campaigns/${id}`, {
      method: 'PUT',
      body: data
    });
  }

  async deleteCampaign(id: string) {
    return this.request(`/api/campaigns/${id}`, {
      method: 'DELETE'
    });
  }

  // Analytics endpoints
  async getCampaignAnalytics(campaignId: string) {
    return this.request(`/api/analytics/campaigns/${campaignId}`);
  }

  async getPerformanceAnalytics() {
    return this.request('/api/analytics/performance');
  }

  // Cost tracking endpoints
  async getCostSummary() {
    return this.request('/api/costs/summary');
  }

  async getDailyCostTrend() {
    return this.request('/api/costs/daily-trend');
  }

  // Provider status endpoints
  async getProviderStatus() {
    return this.request('/api/providers/status');
  }

  // Settings endpoints
  async getSettings() {
    return this.request('/api/settings');
  }

  async updateSettings(data: Record<string, any>) {
    return this.request('/api/settings', {
      method: 'PUT',
      body: data
    });
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }
}

export const apiClient = new ApiClient();
