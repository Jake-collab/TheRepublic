import 'react native';

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  membership_active: boolean;
  stripe_customer_id: string | null;
  accepted_terms_at: string | null;
  accepted_privacy_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: 'user' | 'admin';
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  default_color_light: string;
  default_color_dark: string;
  default_sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Website {
  id: string;
  category_id: string;
  name: string;
  url: string;
  description: string | null;
  is_free: boolean;
  is_active: boolean;
  sort_order: number;
  icon_url: string | null;
  custom_user_agent: string | null;
  app_banner_hide_selectors: string | null;
  injected_css: string | null;
  injected_js: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserCategoryPreference {
  id: string;
  user_id: string;
  category_id: string;
  custom_color: string | null;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserWebsitePreference {
  id: string;
  user_id: string;
  website_id: string;
  last_visited_url: string | null;
  last_visited_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Membership {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string | null;
  current_period_end: string | null;
  membership_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  category: 'support' | 'bug' | 'feature';
  subject: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  user_id: string;
  is_admin: boolean;
  message: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export interface PushToken {
  id: string;
  user_id: string;
  device_token: string;
  platform: 'ios' | 'android';
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
}

export interface AppSetting {
  id: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}