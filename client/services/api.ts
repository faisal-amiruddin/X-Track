import { Account, ApiResponse, AuthResponse, OverallSummary, Statistic, TodaySummary, User } from '../types';

const BASE_URL = 'https://xtrack-be.vercel.app/api';

// Helper to handle headers
const getHeaders = (token?: string | null) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// Generic fetch wrapper
async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();
    return data as ApiResponse<T>;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error occurred',
    };
  }
}

export const api = {
  auth: {
    login: async (username: string, password: string): Promise<ApiResponse<AuthResponse>> => {
      return fetchAPI<AuthResponse>('/auth/login', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ username, password }),
      });
    },
  },
  users: {
    // Admin Only - Full Access
    getAll: async (token: string): Promise<ApiResponse<User[]>> => {
      return fetchAPI<User[]>('/users', {
        method: 'GET',
        headers: getHeaders(token),
      });
    },
    getById: async (token: string, id: number): Promise<ApiResponse<User>> => {
      return fetchAPI<User>(`/users/${id}`, {
        method: 'GET',
        headers: getHeaders(token),
      });
    },
    create: async (token: string, userData: Partial<User> & { password?: string }): Promise<ApiResponse<User>> => {
      return fetchAPI<User>('/users', {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify(userData),
      });
    },
    update: async (token: string, id: number, userData: Partial<User> & { password?: string }): Promise<ApiResponse<User>> => {
      return fetchAPI<User>(`/users/${id}`, {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify(userData),
      });
    },
    delete: async (token: string, id: number): Promise<ApiResponse<void>> => {
      return fetchAPI<void>(`/users/${id}`, {
        method: 'DELETE',
        headers: getHeaders(token),
      });
    }
  },
  accounts: {
    // Admin Only - View All Accounts
    getAll: async (token: string): Promise<ApiResponse<Account[]>> => {
      return fetchAPI<Account[]>('/accounts', {
        method: 'GET',
        headers: getHeaders(token),
      });
    },
    // User
    getMyAccounts: async (token: string): Promise<ApiResponse<Account[]>> => {
      return fetchAPI<Account[]>('/accounts/me', {
        method: 'GET',
        headers: getHeaders(token),
      });
    },
    getById: async (token: string, id: number): Promise<ApiResponse<Account>> => {
      return fetchAPI<Account>(`/accounts/${id}`, {
        method: 'GET',
        headers: getHeaders(token),
      });
    },
    create: async (token: string, name: string, userId: number): Promise<ApiResponse<Account>> => {
      return fetchAPI<Account>('/accounts', {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ name, user_id: userId }),
      });
    },
    update: async (token: string, accountId: number, name: string): Promise<ApiResponse<Account>> => {
      return fetchAPI<Account>(`/accounts/${accountId}`, {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify({ name }),
      });
    },
    delete: async (token: string, accountId: number): Promise<ApiResponse<void>> => {
      return fetchAPI<void>(`/accounts/${accountId}`, {
        method: 'DELETE',
        headers: getHeaders(token),
      });
    },
    regenerateToken: async (token: string, accountId: number): Promise<ApiResponse<Account>> => {
      return fetchAPI<Account>(`/accounts/${accountId}/regenerate-token`, {
        method: 'POST',
        headers: getHeaders(token),
      });
    },
  },
  statistics: {
    getAll: async (token: string, accountId: number, page: number = 1, pageSize: number = 20): Promise<ApiResponse<Statistic[]>> => {
      return fetchAPI<Statistic[]>(`/statistics/${accountId}?page=${page}&page_size=${pageSize}`, {
        method: 'GET',
        headers: getHeaders(token),
      });
    },
    getRange: async (token: string, accountId: number, startDate: string, endDate: string): Promise<ApiResponse<Statistic[]>> => {
       return fetchAPI<Statistic[]>(`/statistics/${accountId}/range?start_date=${startDate}&end_date=${endDate}`, {
        method: 'GET',
        headers: getHeaders(token),
      });
    },
    getToday: async (token: string, accountId: number): Promise<ApiResponse<TodaySummary>> => {
      return fetchAPI<TodaySummary>(`/statistics/${accountId}/today`, {
        method: 'GET',
        headers: getHeaders(token),
      });
    },
    getOverall: async (token: string, accountId: number): Promise<ApiResponse<OverallSummary>> => {
      return fetchAPI<OverallSummary>(`/statistics/${accountId}/summary`, {
        method: 'GET',
        headers: getHeaders(token),
      });
    }
  }
};
