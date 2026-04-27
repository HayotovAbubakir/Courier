CREATE TABLE IF NOT EXISTS public.clients (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  phone text,
  address text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.factories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  phone text,
  address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.factories DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.deliveries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES public.clients(id),
  delivery_date date,
  due_date date,
  total_amount numeric DEFAULT 0,
  paid_amount numeric DEFAULT 0,
  status text DEFAULT 'unpaid',
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.deliveries
ADD COLUMN IF NOT EXISTS factory_id uuid REFERENCES public.factories(id);

CREATE TABLE IF NOT EXISTS public.delivery_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id uuid REFERENCES public.deliveries(id),
  product_name text,
  product_image_url text,
  quantity numeric,
  unit text,
  unit_price numeric,
  total_price numeric
);

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id uuid REFERENCES public.deliveries(id),
  amount numeric,
  payment_date date,
  notes text
);

ALTER TABLE public.delivery_items ADD COLUMN IF NOT EXISTS product_image_url text;
