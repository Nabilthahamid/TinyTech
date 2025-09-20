-- =====================================================
-- TinyTech MVC App - Complete Database Schema
-- =====================================================
-- This file contains all the SQL commands needed to set up
-- the complete database for the Svelte MVC application
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PROFILES TABLE
-- =====================================================
-- Stores user profile information linked to auth.users
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  website TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- POSTS TABLE
-- =====================================================
-- Stores blog posts and content
CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  slug TEXT UNIQUE,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  published BOOLEAN DEFAULT false,
  featured_image_url TEXT,
  tags TEXT[],
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PASSWORD RESET TOKENS TABLE
-- =====================================================
-- Stores password reset tokens for forgot password functionality
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- USER SESSIONS TABLE (Optional - for session tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for posts updated_at
CREATE TRIGGER update_posts_updated_at 
    BEFORE UPDATE ON posts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to generate unique slug from title
CREATE OR REPLACE FUNCTION generate_post_slug(title TEXT, post_id UUID DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Convert title to slug format
  base_slug := lower(regexp_replace(title, '[^a-zA-Z0-9\s]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := trim(base_slug, '-');
  
  final_slug := base_slug;
  
  -- Check for uniqueness
  WHILE EXISTS (
    SELECT 1 FROM posts 
    WHERE slug = final_slug 
    AND (post_id IS NULL OR id != post_id)
  ) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES POLICIES
-- =====================================================

-- Anyone can view profiles
CREATE POLICY "Public profiles are viewable by everyone" 
ON profiles FOR SELECT 
USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

-- Users can insert their own profile (handled by trigger)
CREATE POLICY "Users can insert own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- =====================================================
-- POSTS POLICIES
-- =====================================================

-- Anyone can view published posts
CREATE POLICY "Published posts are viewable by everyone" 
ON posts FOR SELECT 
USING (published = true);

-- Authors can view their own posts (published and unpublished)
CREATE POLICY "Authors can view own posts" 
ON posts FOR SELECT 
USING (auth.uid() = author_id);

-- Authors can create posts
CREATE POLICY "Authors can create posts" 
ON posts FOR INSERT 
WITH CHECK (auth.uid() = author_id);

-- Authors can update their own posts
CREATE POLICY "Authors can update own posts" 
ON posts FOR UPDATE 
USING (auth.uid() = author_id);

-- Authors can delete their own posts
CREATE POLICY "Authors can delete own posts" 
ON posts FOR DELETE 
USING (auth.uid() = author_id);

-- =====================================================
-- PASSWORD RESET TOKENS POLICIES
-- =====================================================

-- Users can only access their own password reset tokens
CREATE POLICY "Users can manage own password reset tokens" 
ON password_reset_tokens 
USING (auth.uid() = user_id);

-- =====================================================
-- USER SESSIONS POLICIES
-- =====================================================

-- Users can only access their own sessions
CREATE POLICY "Users can manage own sessions" 
ON user_sessions 
USING (auth.uid() = user_id);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_name ON profiles(name);

-- Indexes for posts
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_tags ON posts USING GIN(tags);

-- Indexes for password reset tokens
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- Indexes for user sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- =====================================================
-- CLEANUP FUNCTIONS
-- =====================================================

-- Function to clean up expired password reset tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM password_reset_tokens 
  WHERE expires_at < NOW() OR used = true;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM user_sessions 
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Uncomment the following lines to insert sample data for testing

-- INSERT INTO profiles (id, email, name, bio) VALUES 
--   (uuid_generate_v4(), 'demo@example.com', 'Demo User', 'This is a demo user for testing purposes');

-- INSERT INTO posts (title, content, author_id, published, slug) VALUES 
--   (uuid_generate_v4(), 'Welcome to Our Blog', 'This is the first post on our blog. Welcome!', 
--    (SELECT id FROM profiles WHERE email = 'demo@example.com'), true, 
--    generate_post_slug('Welcome to Our Blog'));

-- =====================================================
-- E-COMMERCE TABLES
-- =====================================================

-- =====================================================
-- CATEGORIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  image TEXT,
  meta_title TEXT,
  meta_description TEXT,
  sort_order INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PRODUCTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  short_description TEXT,
  sku TEXT UNIQUE NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  compare_at_price DECIMAL(10,2),
  cost_price DECIMAL(10,2),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  brand TEXT,
  weight DECIMAL(8,2),
  dimensions JSONB,
  images TEXT[] DEFAULT '{}',
  featured_image TEXT,
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'draft' CHECK (status IN ('active', 'inactive', 'draft')),
  featured BOOLEAN DEFAULT false,
  meta_title TEXT,
  meta_description TEXT,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INVENTORY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  sku TEXT NOT NULL,
  quantity INTEGER DEFAULT 0,
  reserved INTEGER DEFAULT 0,
  available INTEGER GENERATED ALWAYS AS (quantity - reserved) STORED,
  low_stock_threshold INTEGER DEFAULT 5,
  reorder_point INTEGER DEFAULT 10,
  reorder_quantity INTEGER DEFAULT 50,
  location TEXT,
  bin_location TEXT,
  notes TEXT,
  last_counted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id)
);

-- =====================================================
-- INVENTORY TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('in', 'out', 'adjustment', 'reserved', 'unreserved')),
  quantity INTEGER NOT NULL,
  reference_type TEXT CHECK (reference_type IN ('order', 'adjustment', 'transfer', 'return')),
  reference_id UUID,
  notes TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ORDERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'partially_refunded')),
  payment_method TEXT NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  shipping_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  shipping_address JSONB NOT NULL,
  billing_address JSONB NOT NULL,
  notes TEXT,
  tracking_number TEXT,
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ORDER ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  product_name TEXT NOT NULL,
  product_sku TEXT NOT NULL,
  product_image TEXT
);

-- =====================================================
-- DISCOUNTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS discounts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed_amount', 'free_shipping')),
  value DECIMAL(10,2) NOT NULL,
  minimum_amount DECIMAL(10,2),
  maximum_discount DECIMAL(10,2),
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  applies_to TEXT DEFAULT 'all' CHECK (applies_to IN ('all', 'categories', 'products', 'users')),
  categories UUID[] DEFAULT '{}',
  products UUID[] DEFAULT '{}',
  users UUID[] DEFAULT '{}',
  one_time_use BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- DISCOUNT USAGE TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS discount_usage (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  discount_id UUID REFERENCES discounts(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount_discounted DECIMAL(10,2) NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(discount_id, order_id, user_id)
);

-- =====================================================
-- PRODUCT VIEWS TABLE (for analytics)
-- =====================================================
CREATE TABLE IF NOT EXISTS product_views (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  ip_address INET,
  user_agent TEXT,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ADMIN ROLES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_roles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'manager', 'staff')),
  permissions TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- =====================================================
-- E-COMMERCE TRIGGERS
-- =====================================================

-- Trigger for products updated_at
CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for categories updated_at
CREATE TRIGGER update_categories_updated_at 
    BEFORE UPDATE ON categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for inventory updated_at
CREATE TRIGGER update_inventory_updated_at 
    BEFORE UPDATE ON inventory 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for orders updated_at
CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for discounts updated_at
CREATE TRIGGER update_discounts_updated_at 
    BEFORE UPDATE ON discounts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for admin_roles updated_at
CREATE TRIGGER update_admin_roles_updated_at 
    BEFORE UPDATE ON admin_roles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate unique product slug
CREATE OR REPLACE FUNCTION generate_product_slug(name TEXT, product_id UUID DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Convert name to slug format
  base_slug := lower(regexp_replace(name, '[^a-zA-Z0-9\s]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := trim(base_slug, '-');
  
  final_slug := base_slug;
  
  -- Check for uniqueness
  WHILE EXISTS (
    SELECT 1 FROM products 
    WHERE slug = final_slug 
    AND (product_id IS NULL OR id != product_id)
  ) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Function to generate unique category slug
CREATE OR REPLACE FUNCTION generate_category_slug(name TEXT, category_id UUID DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Convert name to slug format
  base_slug := lower(regexp_replace(name, '[^a-zA-Z0-9\s]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := trim(base_slug, '-');
  
  final_slug := base_slug;
  
  -- Check for uniqueness
  WHILE EXISTS (
    SELECT 1 FROM categories 
    WHERE slug = final_slug 
    AND (category_id IS NULL OR id != category_id)
  ) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  counter INTEGER;
BEGIN
  -- Get the next sequence number
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 3) AS INTEGER)), 0) + 1
  INTO counter
  FROM orders
  WHERE order_number LIKE 'OR%';
  
  -- Format as OR + 6 digit number
  new_number := 'OR' || LPAD(counter::TEXT, 6, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update inventory when order is created/updated
CREATE OR REPLACE FUNCTION update_inventory_on_order()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Reserve inventory for new order items
    UPDATE inventory 
    SET reserved = reserved + NEW.quantity
    WHERE product_id = NEW.product_id;
    
    -- Log inventory transaction
    INSERT INTO inventory_transactions (product_id, type, quantity, reference_type, reference_id)
    VALUES (NEW.product_id, 'reserved', NEW.quantity, 'order', NEW.order_id);
    
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle quantity changes
    IF NEW.quantity != OLD.quantity THEN
      UPDATE inventory 
      SET reserved = reserved - OLD.quantity + NEW.quantity
      WHERE product_id = NEW.product_id;
      
      -- Log inventory transaction
      INSERT INTO inventory_transactions (product_id, type, quantity, reference_type, reference_id)
      VALUES (NEW.product_id, 'adjustment', NEW.quantity - OLD.quantity, 'order', NEW.order_id);
    END IF;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Release reserved inventory
    UPDATE inventory 
    SET reserved = reserved - OLD.quantity
    WHERE product_id = OLD.product_id;
    
    -- Log inventory transaction
    INSERT INTO inventory_transactions (product_id, type, quantity, reference_type, reference_id)
    VALUES (OLD.product_id, 'unreserved', OLD.quantity, 'order', OLD.order_id);
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for order items inventory management
CREATE TRIGGER order_items_inventory_trigger
  AFTER INSERT OR UPDATE OR DELETE ON order_items
  FOR EACH ROW EXECUTE FUNCTION update_inventory_on_order();

-- Function to update discount usage count
CREATE OR REPLACE FUNCTION update_discount_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update used count
    UPDATE discounts 
    SET used_count = used_count + 1
    WHERE id = NEW.discount_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrease used count
    UPDATE discounts 
    SET used_count = used_count - 1
    WHERE id = OLD.discount_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for discount usage
CREATE TRIGGER discount_usage_trigger
  AFTER INSERT OR DELETE ON discount_usage
  FOR EACH ROW EXECUTE FUNCTION update_discount_usage();

-- =====================================================
-- E-COMMERCE ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on e-commerce tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CATEGORIES POLICIES
-- =====================================================

-- Anyone can view active categories
CREATE POLICY "Active categories are viewable by everyone" 
ON categories FOR SELECT 
USING (status = 'active');

-- Admins can manage categories
CREATE POLICY "Admins can manage categories" 
ON categories FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM admin_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'manager')
  )
);

-- =====================================================
-- PRODUCTS POLICIES
-- =====================================================

-- Anyone can view active products
CREATE POLICY "Active products are viewable by everyone" 
ON products FOR SELECT 
USING (status = 'active');

-- Admins can manage products
CREATE POLICY "Admins can manage products" 
ON products FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM admin_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'manager')
  )
);

-- =====================================================
-- INVENTORY POLICIES
-- =====================================================

-- Admins can manage inventory
CREATE POLICY "Admins can manage inventory" 
ON inventory FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM admin_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'manager', 'staff')
  )
);

-- =====================================================
-- ORDERS POLICIES
-- =====================================================

-- Users can view their own orders
CREATE POLICY "Users can view own orders" 
ON orders FOR SELECT 
USING (auth.uid() = user_id);

-- Admins can view all orders
CREATE POLICY "Admins can view all orders" 
ON orders FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM admin_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'manager', 'staff')
  )
);

-- Users can create orders
CREATE POLICY "Users can create orders" 
ON orders FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Admins can update orders
CREATE POLICY "Admins can update orders" 
ON orders FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM admin_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'manager', 'staff')
  )
);

-- =====================================================
-- ORDER ITEMS POLICIES
-- =====================================================

-- Users can view order items for their orders
CREATE POLICY "Users can view own order items" 
ON order_items FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE id = order_id 
    AND user_id = auth.uid()
  )
);

-- Admins can view all order items
CREATE POLICY "Admins can view all order items" 
ON order_items FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM admin_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'manager', 'staff')
  )
);

-- =====================================================
-- DISCOUNTS POLICIES
-- =====================================================

-- Anyone can view active discounts
CREATE POLICY "Active discounts are viewable by everyone" 
ON discounts FOR SELECT 
USING (status = 'active' AND valid_until > NOW());

-- Admins can manage discounts
CREATE POLICY "Admins can manage discounts" 
ON discounts FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM admin_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'manager')
  )
);

-- =====================================================
-- ADMIN ROLES POLICIES
-- =====================================================

-- Only super admins can manage admin roles
CREATE POLICY "Super admins can manage admin roles" 
ON admin_roles FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM admin_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- =====================================================
-- E-COMMERCE INDEXES
-- =====================================================

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_status ON categories(status);

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_available ON inventory(available);
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON inventory(available, low_stock_threshold);

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Order items indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Discounts indexes
CREATE INDEX IF NOT EXISTS idx_discounts_code ON discounts(code);
CREATE INDEX IF NOT EXISTS idx_discounts_status ON discounts(status);
CREATE INDEX IF NOT EXISTS idx_discounts_valid_until ON discounts(valid_until);

-- Product views indexes
CREATE INDEX IF NOT EXISTS idx_product_views_product_id ON product_views(product_id);
CREATE INDEX IF NOT EXISTS idx_product_views_user_id ON product_views(user_id);
CREATE INDEX IF NOT EXISTS idx_product_views_viewed_at ON product_views(viewed_at DESC);

-- Admin roles indexes
CREATE INDEX IF NOT EXISTS idx_admin_roles_user_id ON admin_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_roles_role ON admin_roles(role);

-- =====================================================
-- SHOPPING CART TABLES
-- =====================================================

-- =====================================================
-- CARTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS carts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  subtotal DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  shipping_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id),
  UNIQUE(session_id)
);

-- =====================================================
-- CART ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cart_id UUID REFERENCES carts(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(cart_id, product_id)
);

-- =====================================================
-- REVIEWS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  content TEXT,
  verified_purchase BOOLEAN DEFAULT false,
  helpful_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);

-- =====================================================
-- REVIEW HELPFULNESS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS review_helpfulness (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  review_id UUID REFERENCES reviews(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_helpful BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(review_id, user_id)
);

-- =====================================================
-- WISHLISTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS wishlists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- WISHLIST ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS wishlist_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  wishlist_id UUID REFERENCES wishlists(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(wishlist_id, product_id)
);

-- =====================================================
-- PRODUCT SPECIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS product_specifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  value TEXT NOT NULL,
  group_name TEXT DEFAULT 'General',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- SHIPPING METHODS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS shipping_methods (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  cost DECIMAL(10,2) NOT NULL,
  estimated_days TEXT NOT NULL,
  is_available BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TAX RATES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS tax_rates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  rate DECIMAL(5,4) NOT NULL, -- Up to 99.99%
  type TEXT DEFAULT 'percentage' CHECK (type IN ('percentage', 'fixed')),
  applies_to TEXT DEFAULT 'all' CHECK (applies_to IN ('all', 'categories', 'products')),
  category_ids UUID[] DEFAULT '{}',
  product_ids UUID[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- SHOPPING CART TRIGGERS
-- =====================================================

-- Trigger for cart items updated_at
CREATE TRIGGER update_cart_items_updated_at 
    BEFORE UPDATE ON cart_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for reviews updated_at
CREATE TRIGGER update_reviews_updated_at 
    BEFORE UPDATE ON reviews 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for wishlists updated_at
CREATE TRIGGER update_wishlists_updated_at 
    BEFORE UPDATE ON wishlists 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for product_specifications updated_at
CREATE TRIGGER update_product_specifications_updated_at 
    BEFORE UPDATE ON product_specifications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for shipping_methods updated_at
CREATE TRIGGER update_shipping_methods_updated_at 
    BEFORE UPDATE ON shipping_methods 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for tax_rates updated_at
CREATE TRIGGER update_tax_rates_updated_at 
    BEFORE UPDATE ON tax_rates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update cart totals
CREATE OR REPLACE FUNCTION update_cart_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Update cart totals when cart items change
  UPDATE carts 
  SET 
    subtotal = (
      SELECT COALESCE(SUM(total_price), 0)
      FROM cart_items 
      WHERE cart_id = COALESCE(NEW.cart_id, OLD.cart_id)
    ),
    total_amount = (
      SELECT COALESCE(SUM(total_price), 0)
      FROM cart_items 
      WHERE cart_id = COALESCE(NEW.cart_id, OLD.cart_id)
    ) + tax_amount + shipping_amount - discount_amount,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.cart_id, OLD.cart_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update cart totals
CREATE TRIGGER cart_items_update_totals
  AFTER INSERT OR UPDATE OR DELETE ON cart_items
  FOR EACH ROW EXECUTE FUNCTION update_cart_totals();

-- Function to update review helpfulness count
CREATE OR REPLACE FUNCTION update_review_helpfulness_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update helpfulness count when review_helpfulness changes
  UPDATE reviews 
  SET 
    helpful_count = (
      SELECT COUNT(*)
      FROM review_helpfulness 
      WHERE review_id = COALESCE(NEW.review_id, OLD.review_id)
      AND is_helpful = true
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.review_id, OLD.review_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update review helpfulness count
CREATE TRIGGER review_helpfulness_update_count
  AFTER INSERT OR UPDATE OR DELETE ON review_helpfulness
  FOR EACH ROW EXECUTE FUNCTION update_review_helpfulness_count();

-- =====================================================
-- SHOPPING CART ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on shopping cart tables
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_helpfulness ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CARTS POLICIES
-- =====================================================

-- Users can view and manage their own carts
CREATE POLICY "Users can manage own carts" 
ON carts FOR ALL 
USING (
  user_id = auth.uid() OR 
  (user_id IS NULL AND session_id IS NOT NULL)
);

-- =====================================================
-- CART ITEMS POLICIES
-- =====================================================

-- Users can manage items in their own carts
CREATE POLICY "Users can manage own cart items" 
ON cart_items FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM carts 
    WHERE id = cart_id 
    AND (user_id = auth.uid() OR (user_id IS NULL AND session_id IS NOT NULL))
  )
);

-- =====================================================
-- REVIEWS POLICIES
-- =====================================================

-- Anyone can view approved reviews
CREATE POLICY "Approved reviews are viewable by everyone" 
ON reviews FOR SELECT 
USING (status = 'approved');

-- Users can view their own reviews
CREATE POLICY "Users can view own reviews" 
ON reviews FOR SELECT 
USING (user_id = auth.uid());

-- Users can create reviews
CREATE POLICY "Users can create reviews" 
ON reviews FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews" 
ON reviews FOR UPDATE 
USING (user_id = auth.uid());

-- Admins can manage all reviews
CREATE POLICY "Admins can manage all reviews" 
ON reviews FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM admin_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'manager')
  )
);

-- =====================================================
-- REVIEW HELPFULNESS POLICIES
-- =====================================================

-- Users can manage their own helpfulness votes
CREATE POLICY "Users can manage own helpfulness votes" 
ON review_helpfulness FOR ALL 
USING (user_id = auth.uid());

-- =====================================================
-- WISHLISTS POLICIES
-- =====================================================

-- Users can manage their own wishlists
CREATE POLICY "Users can manage own wishlists" 
ON wishlists FOR ALL 
USING (user_id = auth.uid());

-- Users can view public wishlists
CREATE POLICY "Public wishlists are viewable by everyone" 
ON wishlists FOR SELECT 
USING (is_public = true);

-- =====================================================
-- WISHLIST ITEMS POLICIES
-- =====================================================

-- Users can manage items in their own wishlists
CREATE POLICY "Users can manage own wishlist items" 
ON wishlist_items FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM wishlists 
    WHERE id = wishlist_id 
    AND user_id = auth.uid()
  )
);

-- =====================================================
-- PRODUCT SPECIFICATIONS POLICIES
-- =====================================================

-- Anyone can view product specifications
CREATE POLICY "Product specifications are viewable by everyone" 
ON product_specifications FOR SELECT 
USING (true);

-- Admins can manage product specifications
CREATE POLICY "Admins can manage product specifications" 
ON product_specifications FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM admin_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'manager')
  )
);

-- =====================================================
-- SHIPPING METHODS POLICIES
-- =====================================================

-- Anyone can view available shipping methods
CREATE POLICY "Available shipping methods are viewable by everyone" 
ON shipping_methods FOR SELECT 
USING (is_available = true);

-- Admins can manage shipping methods
CREATE POLICY "Admins can manage shipping methods" 
ON shipping_methods FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM admin_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'manager')
  )
);

-- =====================================================
-- TAX RATES POLICIES
-- =====================================================

-- Anyone can view active tax rates
CREATE POLICY "Active tax rates are viewable by everyone" 
ON tax_rates FOR SELECT 
USING (is_active = true);

-- Admins can manage tax rates
CREATE POLICY "Admins can manage tax rates" 
ON tax_rates FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM admin_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'manager')
  )
);

-- =====================================================
-- SHOPPING CART INDEXES
-- =====================================================

-- Cart indexes
CREATE INDEX IF NOT EXISTS idx_carts_user_id ON carts(user_id);
CREATE INDEX IF NOT EXISTS idx_carts_session_id ON carts(session_id);

-- Cart items indexes
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

-- Review helpfulness indexes
CREATE INDEX IF NOT EXISTS idx_review_helpfulness_review_id ON review_helpfulness(review_id);
CREATE INDEX IF NOT EXISTS idx_review_helpfulness_user_id ON review_helpfulness(user_id);

-- Wishlists indexes
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_is_public ON wishlists(is_public);

-- Wishlist items indexes
CREATE INDEX IF NOT EXISTS idx_wishlist_items_wishlist_id ON wishlist_items(wishlist_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_product_id ON wishlist_items(product_id);

-- Product specifications indexes
CREATE INDEX IF NOT EXISTS idx_product_specifications_product_id ON product_specifications(product_id);
CREATE INDEX IF NOT EXISTS idx_product_specifications_group_name ON product_specifications(group_name);

-- Shipping methods indexes
CREATE INDEX IF NOT EXISTS idx_shipping_methods_is_available ON shipping_methods(is_available);
CREATE INDEX IF NOT EXISTS idx_shipping_methods_sort_order ON shipping_methods(sort_order);

-- Tax rates indexes
CREATE INDEX IF NOT EXISTS idx_tax_rates_is_active ON tax_rates(is_active);
CREATE INDEX IF NOT EXISTS idx_tax_rates_applies_to ON tax_rates(applies_to);

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

-- Create a function to verify the setup
CREATE OR REPLACE FUNCTION verify_setup()
RETURNS TABLE (
  table_name TEXT,
  row_count BIGINT,
  has_rls BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.table_name::TEXT,
    CASE t.table_name
      WHEN 'profiles' THEN (SELECT COUNT(*) FROM profiles)
      WHEN 'posts' THEN (SELECT COUNT(*) FROM posts)
      WHEN 'password_reset_tokens' THEN (SELECT COUNT(*) FROM password_reset_tokens)
      WHEN 'user_sessions' THEN (SELECT COUNT(*) FROM user_sessions)
    END as row_count,
    t.is_row_security_enabled
  FROM information_schema.tables t
  WHERE t.table_schema = 'public' 
  AND t.table_name IN ('profiles', 'posts', 'password_reset_tokens', 'user_sessions')
  ORDER BY t.table_name;
END;
$$ LANGUAGE plpgsql;

-- Run verification (optional)
-- SELECT * FROM verify_setup();
