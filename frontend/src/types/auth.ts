export type UserRole = "student" | "teacher" | "researcher" | "professional" | "admin";
export type AppThemeMode = "light" | "dark" | "system";
export type AppColorTheme = "indigo" | "blue" | "purple" | "cyan" | "green" | "rose" | "orange" | "custom";
export type PlanTier = "free" | "student" | "pro" | "team";

export interface User {
  id: string | number;
  name: string;
  email: string;
  role: UserRole;
  is_admin?: boolean;
  seller_payment_info?: any;
  country: string;
  interface_language: string;
  presentation_language: string;
  app_theme_mode: AppThemeMode;
  app_color_theme: AppColorTheme;
  custom_primary_color?: string;
  subscription?: {
    plan: PlanTier;
    status: "active" | "inactive" | "cancelled";
    renews_at?: string;
  };
  ai_credits?: {
    total_granted: number;
    used: number;
    remaining: number;
  };
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface GuestLimitResponse {
  session_id?: string;
  count?: number;
  generation_count: number;
  max_allowed?: number;
  max_generations: number;
  remaining_generations?: number;
  allowed: boolean;
  status_code?: string;
  status?: string;
  message: string;
}
