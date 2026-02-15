-- # Create Products and Categories Tables with Image Support
--
-- ## New Tables
--
-- ### categories
-- - id (uuid, primary key) - Unique identifier for each category
-- - name_en (text) - Category name in English
-- - name_so (text) - Category name in Somali
-- - display_order (integer) - Order for displaying categories
-- - created_at (timestamptz) - Record creation timestamp
-- - updated_at (timestamptz) - Record last update timestamp
--
-- ### products
-- - id (uuid, primary key) - Unique identifier for each product
-- - name_en (text) - Product name in English
-- - name_so (text) - Product name in Somali
-- - barcode (text, nullable) - Product barcode/SKU
-- - price_usd (numeric) - Product price in USD
-- - category_id (uuid, foreign key) - Reference to categories table
-- - stock_quantity (integer) - Current stock level
-- - restock_threshold (integer) - Minimum stock level before reorder
-- - image_url (text, nullable) - URL to product image in Supabase Storage
-- - is_active (boolean) - Whether product is active/available
-- - created_at (timestamptz) - Record creation timestamp
-- - updated_at (timestamptz) - Record last update timestamp
--
-- ## Storage
--
-- ### product-images bucket
-- - Public bucket for storing product images
-- - Anyone can read images
-- - Authenticated users can upload images
--
-- ## Security
--
-- ### Row Level Security (RLS)
-- - Enable RLS on both tables
-- - Allow public read access for both tables (needed for POS operations)
-- - Allow authenticated users to insert/update/delete products and categories
--
-- ## Important Notes
-- 1. Product images will be stored in Supabase Storage bucket 'product-images'
-- 2. Image URLs will be publicly accessible for fast POS operations
-- 3. Price stored in USD, conversion to local currency handled in application
-- 4. Stock management integrated with inventory tracking

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en text NOT NULL,
  name_so text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en text NOT NULL,
  name_so text NOT NULL,
  barcode text,
  price_usd numeric NOT NULL CHECK (price_usd >= 0),
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  restock_threshold integer NOT NULL DEFAULT 10 CHECK (restock_threshold >= 0),
  image_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on categories table
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Categories policies - allow public read, authenticated write
CREATE POLICY "Anyone can read categories"
  ON categories
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert categories"
  ON categories
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories"
  ON categories
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete categories"
  ON categories
  FOR DELETE
  TO authenticated
  USING (true);

-- Enable RLS on products table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Products policies - allow public read, authenticated write
CREATE POLICY "Anyone can read products"
  ON products
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert products"
  ON products
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update products"
  ON products
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete products"
  ON products
  FOR DELETE
  TO authenticated
  USING (true);

-- Storage policies for product-images bucket
CREATE POLICY "Anyone can view product images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload product images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images' AND
    (storage.foldername(name))[1] = 'products'
  );

CREATE POLICY "Authenticated users can update product images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-images')
  WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can delete product images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images');