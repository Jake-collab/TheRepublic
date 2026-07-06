-- ============================================
-- THE REPUBLIC - SUPABASE FULL SETUP
-- ============================================
-- This file contains all SQL to be executed in Supabase SQL Editor
-- Split into labeled sections for clarity
-- ============================================

-- ============================================
-- SECTION 001: CORE SCHEMA
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  membership_active BOOLEAN DEFAULT FALSE,
  stripe_customer_id TEXT,
  accepted_terms_at TIMESTAMPTZ,
  accepted_privacy_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(id)
);

-- Create user_roles table for admin management
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  default_color_light TEXT DEFAULT '#000000',
  default_color_dark TEXT DEFAULT '#FFFFFF',
  default_sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create websites table
CREATE TABLE IF NOT EXISTS public.websites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  is_free BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  icon_url TEXT,
  custom_user_agent TEXT,
  app_banner_hide_selectors TEXT,
  injected_css TEXT,
  injected_js TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_category_preferences table
CREATE TABLE IF NOT EXISTS public.user_category_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  custom_color TEXT,
  sort_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category_id)
);

-- Create user_website_preferences table
CREATE TABLE IF NOT EXISTS public.user_website_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  last_visited_url TEXT,
  last_visited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, website_id)
);

-- Create memberships table
CREATE TABLE IF NOT EXISTS public.memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT,
  current_period_end TIMESTAMPTZ,
  membership_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('support', 'bug', 'feature')),
  subject TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'pending', 'resolved', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create support_messages table
CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_admin BOOLEAN DEFAULT FALSE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'general',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create push_tokens table
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, device_token)
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id TEXT,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create app_settings table
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_websites_category ON websites(category_id);
CREATE INDEX IF NOT EXISTS idx_websites_category_active ON websites(category_id, is_active, is_free);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs(table_name, created_at);

-- ============================================
-- SECTION 002: RLS POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_category_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_website_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- PROFILES RLS
CREATE POLICY "Profiles are viewable by owner" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Profiles are updatable by owner" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Profiles are insertable by auth" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- USER_ROLES RLS
CREATE POLICY "User roles are viewable by admins" ON public.user_roles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "User roles are manageable by admins" ON public.user_roles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- CATEGORIES RLS
CREATE POLICY "Anyone can view active categories" ON public.categories
  FOR SELECT USING (is_active = TRUE);

-- WEBSITES RLS
CREATE POLICY "Anyone can view active websites" ON public.websites
  FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Free websites are accessible to all" ON public.websites
  FOR SELECT USING (is_free = TRUE);

-- Note: Non-free websites are filtered in the API based on membership
-- This allows authenticated users with active memberships to access

-- USER_CATEGORY_PREFERENCES RLS
CREATE POLICY "Users can manage own category preferences" ON public.user_category_preferences
  FOR ALL USING (auth.uid() = user_id);

-- USER_WEBSITE_PREFERENCES RLS
CREATE POLICY "Users can manage own website preferences" ON public.user_website_preferences
  FOR ALL USING (auth.uid() = user_id);

-- MEMBERSHIPS RLS
CREATE POLICY "Memberships are viewable by owner" ON public.memberships
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Memberships are updatable by service role" ON public.memberships
  FOR ALL USING (true);

-- SUPPORT_TICKETS RLS
CREATE POLICY "Users can view own support tickets" ON public.support_tickets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create support tickets" ON public.support_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all tickets" ON public.support_tickets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- SUPPORT_MESSAGES RLS
CREATE POLICY "Users can view own ticket messages" ON public.support_messages
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.user_roles ur 
      JOIN public.support_tickets st ON st.user_id = auth.uid() 
      WHERE st.id = ticket_id)
  );
CREATE POLICY "Admins can manage all messages" ON public.support_messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- NOTIFICATIONS RLS
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications read status" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- PUSH_TOKENS RLS
CREATE POLICY "Users can manage own push tokens" ON public.push_tokens
  FOR ALL USING (auth.uid() = user_id);

-- AUDIT_LOGS RLS
CREATE POLICY "Audits are viewable by admins" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Service role can insert audits" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- APP_SETTINGS RLS
CREATE POLICY "Anyone can read app settings" ON public.app_settings
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage app settings" ON public.app_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- SECTION 003: FUNCTIONS & TRIGGERS
-- ============================================

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'display_name'
  );
  
  -- Insert default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- Create default category preferences for all active categories
  INSERT INTO public.user_category_preferences (user_id, category_id, sort_order)
  SELECT 
    NEW.id,
    c.id,
    c.default_sort_order
  FROM public.categories c
  WHERE c.is_active = TRUE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update profile timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS updated_at_profiles ON public.profiles;
CREATE TRIGGER updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS updated_at_categories ON public.categories;
CREATE TRIGGER updated_at_categories
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS updated_at_websites ON public.websites;
CREATE TRIGGER updated_at_websites
  BEFORE UPDATE ON public.websites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS updated_at_user_category_prefs ON public.user_category_preferences;
CREATE TRIGGER updated_at_user_category_prefs
  BEFORE UPDATE ON public.user_category_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS updated_at_user_website_prefs ON public.user_website_preferences;
CREATE TRIGGER updated_at_user_website_prefs
  BEFORE UPDATE ON public.user_website_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS updated_at_memberships ON public.memberships;
CREATE TRIGGER updated_at_memberships
  BEFORE UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS updated_at_support_tickets ON public.support_tickets;
CREATE TRIGGER updated_at_support_tickets
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS updated_at_app_settings ON public.app_settings;
CREATE TRIGGER updated_at_app_settings
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit(
  p_user_id UUID,
  p_action TEXT,
  p_table_name TEXT,
  p_record_id TEXT,
  p_old_values JSONB,
  p_new_values JSONB
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values, new_values)
  VALUES (p_user_id, p_action, p_table_name, p_record_id, p_old_values, p_new_values);
END;
$$ LANGUAGE plpgsql;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check user membership
CREATE OR REPLACE FUNCTION public.has_active_membership(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = p_user_id AND membership_active = TRUE
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get accessible websites
CREATE OR REPLACE FUNCTION public.get_accessible_websites(p_user_id UUID)
RETURNS TABLE(
  id UUID,
  category_id UUID,
  name TEXT,
  url TEXT,
  description TEXT,
  is_free BOOLEAN,
  sort_order INTEGER,
  icon_url TEXT
) AS $$
BEGIN
  -- If user has active membership, return all active websites
  IF public.has_active_membership(p_user_id) THEN
    RETURN QUERY
    SELECT 
      w.id, w.category_id, w.name, w.url, 
      w.description, w.is_free, w.sort_order, w.icon_url
    FROM public.websites w
    WHERE w.is_active = TRUE
    ORDER BY w.sort_order;
  ELSE
    -- Return only free websites
    RETURN QUERY
    SELECT 
      w.id, w.category_id, w.name, w.url, 
      w.description, w.is_free, w.sort_order, w.icon_url
    FROM public.websites w
    WHERE w.is_active = TRUE AND w.is_free = TRUE
    ORDER BY w.sort_order;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SECTION 004: SEED DATA
-- ============================================

-- Insert default categories (seed data with placeholder URLs)
INSERT INTO public.categories (name, slug, description, default_color_light, default_color_dark, default_sort_order) VALUES
('Mega Marketplaces', 'mega-marketplaces', 'Major online marketplaces', '#000000', '#FFFFFF', 1),
('Grocery Delivery', 'grocery-delivery', 'Online grocery delivery', '#333333', '#AAAAAA', 2),
('Food Delivery', 'food-delivery', 'Food delivery services', '#666666', '#777777', 3),
('Local Service Marketplaces', 'local-services', 'Local service providers', '#007AFF', '#0A84FF', 4),
('Online Freelance Services', 'freelance', 'Freelance platforms', '#34C759', '#30D158', 5),
('Job Boards', 'job-boards', 'Employment platforms', '#FF9500', '#FFD60A', 6),
('Community Marketplaces', 'community', 'Local marketplace listings', '#FF3B30', '#FF453A', 7),
('Travel & Vacation Rentals', 'travel', 'Travel booking sites', '#AF52DE', '#BF5AF2', 8),
('Social Media', 'social-media', 'Social networking', '#000000', '#FFFFFF', 9),
('Electronics', 'electronics', 'Electronics retailers', '#333333', '#AAAAAA', 10),
('Home Improvement', 'home-improvement', 'Home improvement stores', '#666666', '#777777', 11),
('Automotive', 'automotive', 'Auto parts & services', '#007AFF', '#0A84FF', 12),
('Fashion', 'fashion', 'Clothing & fashion', '#34C759', '#30D158', 13),
('Beauty & Personal Care', 'beauty', 'Beauty & skincare', '#FF9500', '#FFD60A', 14),
('Health Supplements', 'supplements', 'Health supplements', '#FF3B30', '#FF453A', 15),
('Mental Health', 'mental-health', 'Mental health platforms', '#AF52DE', '#BF5AF2', 16),
('Fitness', 'fitness', 'Fitness & gym', '#000000', '#FFFFFF', 17),
('Recovery', 'recovery', 'Recovery & therapy', '#333333', '#AAAAAA', 18),
('Biohacking', 'biohacking', 'Biohacking devices', '#666666', '#777777', 19),
('Longevity', 'longevity', 'Longevity & anti-aging', '#007AFF', '#0A84FF', 20),
('Medical Spas', 'medical-spas', 'Medical spa services', '#34C759', '#30D158', 21),
('IV Therapy', 'iv-therapy', 'IV therapy services', '#FF9500', '#FFD60A', 22),
('Weight Loss', 'weight-loss', 'Weight loss programs', '#FF3B30', '#FF453A', 23),
('Diagnostics & Lab Testing', 'diagnostics', 'Lab testing services', '#AF52DE', '#BF5AF2', 24),
('Functional Medicine', 'functional-medicine', 'Functional medicine', '#000000', '#FFFFFF', 25),
('Sleep Optimization', 'sleep', 'Sleep improvement', '#333333', '#AAAAAA', 26),
('Banking', 'banking', 'Online banking', '#666666', '#777777', 27),
('Investing', 'investing', 'Investment platforms', '#007AFF', '#0A84FF', 28),
('Crypto', 'crypto', 'Cryptocurrency platforms', '#34C759', '#30D158', 29),
('Taxes', 'taxes', 'Tax preparation', '#FF9500', '#FFD60A', 30),
('Accounting', 'accounting', 'Accounting software', '#FF3B30', '#FF453A', 31),
('Business Formation', 'business-formation', 'Business incorporation', '#AF52DE', '#BF5AF2', 32),
('Payroll', 'payroll', 'Payroll services', '#000000', '#FFFFFF', 33),
('Payment Services', 'payments', 'Payment processors', '#333333', '#AAAAAA', 34),
('Point of Sale', 'pos', 'POS systems', '#666666', '#777777', 35),
('Website Builders', 'website-builders', 'Website creation', '#007AFF', '#0A84FF', 36),
('Hosting', 'hosting', 'Web hosting', '#34C759', '#30D158', 37),
('Automation', 'automation', 'Automation tools', '#FF9500', '#FFD60A', 38),
('Design Tools', 'design', 'Design platforms', '#FF3B30', '#FF453A', 39),
('Video Editing', 'video-editing', 'Video editing tools', '#AF52DE', '#BF5AF2', 40),
('Music Production', 'music-production', 'Music creation', '#000000', '#FFFFFF', 41),
('Streaming Tools', 'streaming', 'Live streaming', '#333333', '#AAAAAA', 42),
('Creator Platforms', 'creator', 'Creator monetization', '#666666', '#777777', 43),
('Subscription Boxes', 'subscription-boxes', 'Subscription services', '#007AFF', '#0A84FF', 44),
('Online Courses', 'courses', 'Online education', '#34C759', '#30D158', 45),
('Certifications', 'certifications', 'Professional certs', '#FF9500', '#FFD60A', 46),
('Tutoring', 'tutoring', 'Online tutoring', '#FF3B30', '#FF453A', 47),
('Language Learning', 'languages', 'Language apps', '#AF52DE', '#BF5AF2', 48),
('Coding Platforms', 'coding', 'Coding education', '#000000', '#FFFFFF', 49),
('Research Databases', 'research', 'Academic research', '#333333', '#AAAAAA', 50),
('Pet Supplies', 'pet-supplies', 'Pet retail', '#666666', '#777777', 51),
('Pet Food', 'pet-food', 'Pet food delivery', '#007AFF', '#0A84FF', 52),
('Veterinary Services', 'vet', 'Pet veterinary', '#34C759', '#30D158', 53),
('Pet Insurance', 'pet-insurance', 'Pet insurance', '#FF9500', '#FFD60A', 54),
('Grooming', 'grooming', 'Pet grooming', '#FF3B30', '#FF453A', 55),
('Anime & Manga', 'anime', 'Anime streaming', '#AF52DE', '#BF5AF2', 56),
('Sports Streaming', 'sports', 'Sports streaming', '#000000', '#FFFFFF', 57),
('Music Streaming', 'music-streaming', 'Music services', '#333333', '#AAAAAA', 58),
('Podcasts', 'podcasts', 'Podcast platforms', '#666666', '#777777', 59),
('Comics & Manga', 'comics', 'Digital comics', '#007AFF', '#0A84FF', 60),
('Smart Home', 'smart-home', 'Smart home devices', '#34C759', '#30D158', 61),
('Robotics', 'robotics', 'Robotics companies', '#FF9500', '#FFD60A', 62),
('3D Printing', '3d-printing', '3D printing', '#FF3B30', '#FF453A', 63),
('Drones', 'drones', 'Drone retailers', '#AF52DE', '#BF5AF2', 64),
('Sustainable Products', 'sustainable', 'Eco products', '#000000', '#FFFFFF', 65),
('Solar & Energy', 'solar', 'Solar & energy', '#333333', '#AAAAAA', 66),
('Mini Homes & Prefab Homes', 'mini-homes', 'Prefab housing', '#666666', '#777777', 67),
('Industrial Suppliers', 'industrial', 'B2B suppliers', '#007AFF', '#0A84FF', 68),
('B2B Wholesale', 'b2b-wholesale', 'Wholesale platforms', '#34C759', '#30D158', 69),
('Construction Materials', 'construction', 'Construction retail', '#FF9500', '#FFD60A', 70),
('Farm & Agriculture', 'farm', 'Agricultural supply', '#FF3B30', '#FF453A', 71),
('Survival & Outdoor Gear', 'survival', 'Outdoor equipment', '#AF52DE', '#BF5AF2', 72),
('Camping', 'camping', 'Camping platforms', '#000000', '#FFFFFF', 73),
('Outdoor Activities', 'outdoor-activities', 'Outdoor apps', '#333333', '#AAAAAA', 74),
('Cruises', 'cruises', 'Cruise booking', '#666666', '#777777', 75),
('Theme Parks', 'theme-parks', 'Theme park sites', '#007AFF', '#0A84FF', 76),
('Travel Rewards & Cashback', 'rewards', 'Cashback apps', '#34C759', '#30D158', 77),
('Auctions', 'auctions', 'Auction sites', '#FF9500', '#FFD60A', 78),
('Resale & Secondhand', 'resale', 'Secondhand apps', '#FF3B30', '#FF453A', 79),
('Luxury Retail & Resale', 'luxury', 'Luxury retail', '#AF52DE', '#BF5AF2', 80),
('Photography', 'photography', 'Photo equipment', '#000000', '#FFFFFF', 81),
('Printing & Merchandise', 'printing', 'Print on demand', '#333333', '#AAAAAA', 82),
('Domain Names', 'domains', 'Domain registrars', '#666666', '#777777', 83),
('VPN Services', 'vpn', 'VPN providers', '#007AFF', '#0A84FF', 84),
('Cybersecurity Tools', 'security-tools', 'Security software', '#34C759', '#30D158', 85),
('Cloud Computing & Servers', 'cloud', 'Cloud services', '#FF9500', '#FFD60A', 86),
('Open Source & Developer Platforms', 'open-source', 'Dev platforms', '#FF3B30', '#FF453A', 87),
('Recruiting & Hiring', 'recruiting', 'HR platforms', '#AF52DE', '#BF5AF2', 88),
('Legal Services', 'legal', 'Legal services', '#000000', '#FFFFFF', 89),
('Real Estate', 'real-estate', 'Property platforms', '#333333', '#AAAAAA', 90),
('Mortgage & Lending', 'mortgage', 'Lending platforms', '#666666', '#777777', 91),
('Event Tickets', 'tickets', 'Ticket sales', '#007AFF', '#0A84FF', 92),
('Experiences & Activities', 'experiences', 'Activity booking', '#34C759', '#30D158', 93),
('Hotels', 'hotels', 'Hotel booking', '#FF9500', '#FFD60A', 94),
('Flights', 'flights', 'Flight search', '#FF3B30', '#FF453A', 95),
('Car Rentals', 'car-rentals', 'Car rental', '#AF52DE', '#BF5AF2', 96),
('Moving Services', 'moving', 'Moving companies', '#000000', '#FFFFFF', 97),
('Storage', 'storage', 'Storage services', '#333333', '#AAAAAA', 98),
('Cleaning Services', 'cleaning', 'Cleaning services', '#666666', '#777777', 99),
('Lawn Care', 'lawn-care', 'Lawn maintenance', '#007AFF', '#0A84FF', 100),
('Handyman Services', 'handyman', 'Handyman services', '#34C759', '#30D158', 101),
('Plumbing Services', 'plumbing', 'Plumbing services', '#FF9500', '#FFD60A', 102),
('Electrical Services', 'electrical', 'Electrical services', '#FF3B30', '#FF453A', 103),
('Security Systems', 'security-systems', 'Home security', '#AF52DE', '#BF5AF2', 104),
('Phones & Wireless', 'phones', 'Mobile carriers', '#000000', '#FFFFFF', 105),
('Gaming', 'gaming', 'Gaming platforms', '#333333', '#AAAAAA', 106),
('Books', 'books', 'Online bookstores', '#666666', '#777777', 107),
('Art Supplies', 'art-supplies', 'Art materials', '#007AFF', '#0A84FF', 108),
('Crafts', 'crafts', 'Craft supplies', '#34C759', '#30D158', 109),
('Discount Stores', 'discount', 'Discount retailers', '#FF9500', '#FFD60A', 110),
('Luxury Retail', 'luxury-retail', 'Luxury brands', '#FF3B30', '#FF453A', 111),
('Shoes', 'shoes', 'Shoe retailers', '#AF52DE', '#BF5AF2', 112),
('Jewelry', 'jewelry', 'Jewelry stores', '#000000', '#FFFFFF', 113),
('Watches', 'watches', 'Watch retailers', '#333333', '#AAAAAA', 114),
('Streetwear', 'streetwear', 'Streetwear brands', '#666666', '#777777', 115),
('Office Supplies', 'office', 'Office retailers', '#007AFF', '#0A84FF', 116),
('Appliances', 'appliances', 'Appliance stores', '#34C759', '#30D158', 117),
('Furniture Rental', 'furniture-rental', 'Furniture rental', '#FF9500', '#FFD60A', 118),
('RV & Van Life', 'rv', 'RV & van life', '#FF3B30', '#FF453A', 119),
('Boat Rentals', 'boats', 'Boat rental', '#AF52DE', '#BF5AF2', 120),
('Motorcycle & Powersports', 'motorcycle', 'Motorcycle gear', '#000000', '#FFFFFF', 121),
('Sneaker Marketplaces', 'sneakers', 'Sneaker resale', '#333333', '#AAAAAA', 122),
('Trading Cards & Collectibles', 'collectibles', 'Card trading', '#666666', '#777777', 123),
('Concert & Festival Discovery', 'concerts', 'Event discovery', '#007AFF', '#0A84FF', 124),
('News & Media', 'news', 'News platforms', '#34C759', '#30D158', 125),
('Weather & Environmental', 'weather', 'Weather apps', '#FF9500', '#FFD60A', 126),
('Local Discovery', 'local-discovery', 'Local search', '#FF3B30', '#FF453A', 127),
('Maps & Navigation', 'maps', 'Map services', '#AF52DE', '#BF5AF2', 128),
('Public Transit', 'transit', 'Transit apps', '#000000', '#FFFFFF', 129),
('Train & Bus Travel', 'travel-bus', 'Bus & train', '#333333', '#AAAAAA', 130),
('Courier & Logistics', 'logistics', 'Shipping services', '#666666', '#777777', 131),
('Freight & Trucking', 'freight', 'Freight services', '#007AFF', '#0A84FF', 132),
('Government & Public Services', 'government', 'Gov services', '#34C759', '#30D158', 133),
('Charity & Donations', 'charity', 'Charity platforms', '#FF9500', '#FFD60A', 134),
('Auctions & Estate Sales', 'estate-sales', 'Estate sales', '#FF3B30', '#FF453A', 135),
('Senior Services', 'senior', 'Senior care', '#AF52DE', '#BF5AF2', 136),
('Childcare & Family Services', 'childcare', 'Childcare', '#000000', '#FFFFFF', 137),
('Medical Equipment & Supplies', 'medical-equipment', 'Medical supplies', '#333333', '#AAAAAA', 138),
('Emergency Preparedness', 'emergency', 'Emergency prep', '#666666', '#777777', 139),
('Home Building & Contractors', 'contractors', 'Contractors', '#007AFF', '#0A84FF', 140)
ON CONFLICT (slug) DO NOTHING;

-- Insert FREE websites for the 10 free categories
-- Note: URL placeholders - replace with real URLs before production
INSERT INTO public.websites (category_id, name, url, description, is_free, sort_order) 
SELECT 
  c.id,
  w.name,
  w.url,
  w.description,
  TRUE,
  w.sort_order
FROM (
  VALUES 
    -- Free websites (these will be available without membership)
    ('Mega Marketplaces', 'https://www.walmart.com', 'Walmart - Major retailer', 1),
    ('Food Delivery', 'https://www.ubereats.com', 'Uber Eats - Food delivery', 2),
    ('Local Service Marketplaces', 'https://www.taskrabbit.com', 'TaskRabbit - Task services', 3),
    ('Online Freelance Services', 'https://www.freelancer.com', 'Freelancer - Freelance work', 4),
    ('Job Boards', 'https://www.ziprecruiter.com', 'ZipRecruiter - Jobs', 5),
    ('Community Marketplaces', 'https://offerup.com', 'OfferUp - Local marketplace', 6),
    ('Travel & Vacation Rentals', 'https://www.vrbo.com', 'VRBO - Vacation rentals', 7),
    ('Social Media', 'https://www.youtube.com', 'YouTube - Video platform', 8),
    ('Event Tickets', 'https://seatgeek.com', 'SeatGeek - Tickets', 9),
    ('Mega Marketplaces', 'https://www.walmart.com', 'Walmart (repeat for example)', 10)
) AS w(name, url, description, sort_order)
JOIN public.categories c ON c.name = w.category_id
WHERE c.slug = LOWER(REPLACE(w.category_id, ' ', '-'))
ON CONFLICT DO NOTHING;

-- Insert default app settings
INSERT INTO public.app_settings (key, value) VALUES
('max_preloaded_webviews', '3'),
('enable_preloading', 'true'),
('default_expand_mode', 'false'),
('app_name', 'The Republic'),
('support_email', 'contact@therepublic.it.com')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- SECTION 005: ADMIN HELPERS
-- ============================================

-- Function to check if user is admin
COMMENT ON FUNCTION public.is_admin IS 'Returns true if user has admin role';
COMMENT ON FUNCTION public.has_active_membership IS 'Returns true if user has active paid membership';
COMMENT ON FUNCTION public.log_audit IS 'Logs an audit event';
COMMENT ON FUNCTION public.get_accessible_websites IS 'Returns websites accessible to user based on membership';

-- Helper view for admin dashboard
CREATE OR REPLACE VIEW public.admin_dashboard_stats AS
SELECT 
  (SELECT COUNT(*) FROM public.profiles)::bigint AS total_users,
  (SELECT COUNT(*) FROM public.memberships WHERE membership_active = TRUE)::bigint AS active_members,
  (SELECT COUNT(*) FROM public.websites WHERE is_active = TRUE)::bigint AS total_websites,
  (SELECT COUNT(*) FROM public.websites WHERE is_active = TRUE AND is_free = TRUE)::bigint AS free_websites,
  (SELECT COUNT(*) FROM public.websites WHERE is_active = TRUE AND is_free = FALSE)::bigint AS paid_websites,
  (SELECT COUNT(*) FROM public.categories WHERE is_active = TRUE)::bigint AS active_categories,
  (SELECT COUNT(*) FROM public.support_tickets WHERE status = 'open')::bigint AS open_tickets,
  (SELECT COUNT(*) FROM public.support_tickets WHERE category = 'bug' AND status = 'open')::bigint AS open_bugs,
  (SELECT COUNT(*) FROM public.support_tickets WHERE category = 'feature' AND status = 'open')::bigint AS open_features;

-- Helper view for user memberships
CREATE OR REPLACE VIEW public.user_memberships_view AS
SELECT 
  p.id AS user_id,
  p.email,
  p.display_name,
  p.membership_active,
  m.status AS stripe_status,
  m.current_period_end,
  m.stripe_customer_id,
  m.stripe_subscription_id,
  p.created_at AS account_created
FROM public.profiles p
LEFT JOIN public.memberships m ON m.user_id = p.id;

-- Helper view for support tickets with user info
CREATE OR REPLACE VIEW public.support_tickets_view AS
SELECT 
  t.id AS ticket_id,
  t.user_id,
  p.email AS user_email,
  p.display_name AS user_name,
  t.category,
  t.subject,
  t.status,
  t.created_at,
  t.updated_at,
  (SELECT COUNT(*) FROM public.support_messages sm WHERE sm.ticket_id = t.id) AS message_count
FROM public.support_tickets t
JOIN public.profiles p ON p.id = t.user_id;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.user_roles TO authenticated;
GRANT ALL ON public.categories TO authenticated;
GRANT ALL ON public.websites TO authenticated;
GRANT ALL ON public.user_category_preferences TO authenticated;
GRANT ALL ON public.user_website_preferences TO authenticated;
GRANT ALL ON public.memberships TO authenticated;
GRANT ALL ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_messages TO authenticated;
GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.push_tokens TO authenticated;
GRANT ALL ON public.audit_logs TO authenticated;
GRANT ALL ON public.app_settings TO authenticated;

GRANT SELECT ON public.admin_dashboard_stats TO authenticated;
GRANT SELECT ON public.user_memberships_view TO authenticated;
GRANT SELECT ON public.support_tickets_view TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_membership TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_accessible_websites TO authenticated;

-- ============================================
-- END OF SUPABASE FULL SETUP
-- ============================================