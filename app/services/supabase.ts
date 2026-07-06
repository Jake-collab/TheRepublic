import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { APP_CONFIG } from '../constants';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://ucrxecloeewhyocnjghu.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjcnhlY2xvZWV3aHlvY25qZ2h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3Mjc0ODQsImV4cCI6MjA5NDMwMzQ4NH0.1q0kUHEMJxnutw-IU6lcsyjhGieoz1ev8R2XBeXT_KY';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storage: {
      getItem: (key: string) => Promise.resolve(null),
      setItem: (key: string, value: string) => Promise.resolve(),
      removeItem: (key: string) => Promise.resolve(),
    },
  },
  global: {
    headers: {
      'x-client-info': 'expo',
    },
  },
});

// Helper function to check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
};

// Get current user
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Sign up with email
export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
};

// Sign in with email/password
export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

// Sign in with OTP (email magic link)
export const signInWithOTP = async (email: string) => {
  const { data, error } = await supabase.auth.signInWithOtp({ email });
  if (error) throw error;
  return data;
};

// Confirm OTP
export const confirmOTP = async (email: string, token: string) => {
  const { data, error } = await supabase.auth.verifyOtp({ email, token });
  if (error) throw error;
  return data;
};

// Sign out
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// Reset password
export const resetPassword = async (email: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
  return data;
};

// Fetch user profile
export const fetchProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
};

// Update user profile
export const updateProfile = async (userId: string, updates: Record<string, unknown>) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// Accept terms and privacy policy
export const acceptTermsAndPrivacy = async (userId: string) => {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('profiles')
    .update({
      accepted_terms_at: now,
      accepted_privacy_at: now,
      updated_at: now,
    })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// Fetch categories
export const fetchCategories = async (includeInactive = false) => {
  let query = supabase
    .from('categories')
    .select('*')
    .order('default_sort_order');
  
  if (!includeInactive) {
    query = query.eq('is_active', true);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

// Fetch websites by category
export const fetchWebsitesByCategory = async (
  categoryId: string,
  includeInactive = false
) => {
  let query = supabase
    .from('websites')
    .select('*')
    .eq('category_id', categoryId)
    .order('sort_order');
  
  if (!includeInactive) {
    query = query.eq('is_active', true);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

// Fetch all free websites
export const fetchFreeWebsites = async () => {
  const { data, error } = await supabase
    .from('websites')
    .select('*')
    .eq('is_free', true)
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return data;
};

// Check if user can access website
export const canAccessWebsite = async (
  userId: string,
  websiteId: string
): Promise<boolean> => {
  // Check if website is free
  const { data: website } = await supabase
    .from('websites')
    .select('is_free')
    .eq('id', websiteId)
    .single();
  
  if (website?.is_free) return true;
  
  // Check user membership
  const { data: profile } = await supabase
    .from('profiles')
    .select('membership_active')
    .eq('id', userId)
    .single();
  
  return profile?.membership_active === true;
};

// Fetch user category preferences
export const fetchUserCategoryPreferences = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_category_preferences')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order');
  if (error) throw error;
  return data;
};

// Update user category preference
export const updateUserCategoryPreference = async (
  userId: string,
  categoryId: string,
  updates: Record<string, unknown>
) => {
  const { data, error } = await supabase
    .from('user_category_preferences')
    .upsert({
      user_id: userId,
      category_id: categoryId,
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
};

// Fetch user website preferences
export const fetchUserWebsitePreferences = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_website_preferences')
    .select('*')
    .eq('user_id', userId)
    .order('last_visited_at', { ascending: false });
  if (error) throw error;
  return data;
};

// Update user website preference
export const updateUserWebsitePreference = async (
  userId: string,
  websiteId: string,
  updates: Record<string, unknown>
) => {
  const { data, error } = await supabase
    .from('user_website_preferences')
    .upsert({
      user_id: userId,
      website_id: websiteId,
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
};

// Fetch notifications
export const fetchNotifications = async (userId: string) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId: string) => {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// Create support ticket
export const createSupportTicket = async (
  userId: string,
  category: 'support' | 'bug' | 'feature',
  subject: string,
  message: string
) => {
  // Create ticket
  const { data: ticket, error: ticketError } = await supabase
    .from('support_tickets')
    .insert({
      user_id: userId,
      category,
      subject,
      status: 'open',
    })
    .select()
    .single();
  if (ticketError) throw ticketError;
  
  // Create first message
  const { data: messageData, error: messageError } = await supabase
    .from('support_messages')
    .insert({
      ticket_id: ticket.id,
      user_id: userId,
      is_admin: false,
      message,
    })
    .select()
    .single();
  if (messageError) throw messageError;
  
  return ticket;
};

// Fetch support tickets
export const fetchSupportTickets = async (userId: string) => {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

// Fetch support messages
export const fetchSupportMessages = async (ticketId: string) => {
  const { data, error } = await supabase
    .from('support_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
};

// Reply to support ticket
export const replyToSupportTicket = async (
  ticketId: string,
  userId: string,
  message: string
) => {
  const { data, error } = await supabase
    .from('support_messages')
    .insert({
      ticket_id: ticketId,
      user_id: userId,
      is_admin: false,
      message,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
};

// Fetch user membership
export const fetchMembership = async (userId: string) => {
  const { data, error } = await supabase
    .from('memberships')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error) throw error;
  return data;
};

// Fetch app settings
export const fetchAppSetting = async (key: string) => {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', key)
    .single();
  if (error) throw error;
  return data?.value;
};