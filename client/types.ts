// API Response Wrapper
export interface PaginationMeta {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
  pagination?: PaginationMeta;
}

// User Models
export interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Account Models
export interface Account {
  id: number;
  user_id: number;
  name: string;
  api_token: string;
  created_at: string;
  updated_at: string;
  user?: User; // Present in Admin GET /api/accounts
}

// Statistic Models
export interface Statistic {
  id: number;
  account_id: number;
  timestamp: string;
  daily_pl: number;
  trades_today: number;
  total_balance: number;
  created_at?: string;
  updated_at?: string;
}

export interface TodaySummary {
  total_records: number;
  latest_balance: number;
  daily_pl: number;
  trades_today: number;
  latest_update: string | null;
  statistics?: Statistic[]; // API returns this array inside today summary
}

export interface OverallSummary {
  has_data: boolean;
  current_balance: number;
  latest_pl?: number;
  latest_trades?: number;
  latest_update: string | null;
}

// State Management
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
}