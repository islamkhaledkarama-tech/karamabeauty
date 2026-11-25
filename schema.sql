-- 1. جدول المنتجات (يعتمد على sku كمفتاح أساسي لسهولة الاستيراد من Excel)
create table if not exists public.products (
  sku text primary key,
  name text not null,
  category text not null default 'الكل',
  old_price numeric(10,2),
  new_price numeric(10,2) not null,
  stock integer not null default 10,
  badge text default '',
  short_desc text default '',
  image_url text default '',
  is_bundle boolean not null default false,
  tags text[] not null default '{}',
  details jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
-- 2. جدول الطلبات (لتسجيل كل طلب تلقائياً قبل فتح واتساب)
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text not null,
  governorate text not null,
  address text not null,
  payment_method text not null,
  items jsonb not null,
  subtotal numeric(10,2) not null,
  discount numeric(10,2) not null default 0,
  shipping numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);
-- 3. تفعيل الحماية (Row Level Security)
alter table public.products enable row level security;
alter table public.orders enable row level security;
-- السماح للزوار بتصفح المنتجات فقط
create policy "Public can read products" on public.products for select to anon, authenticated using (true);
-- السماح للإدارة المسجلة فقط بإضافة وتعديل وحذف المنتجات
create policy "Authenticated admin can manage products" on public.products for all to authenticated using (true) with check (true);
-- السماح للزوار بإرسال طلبات جديدة
create policy "Public can create orders" on public.orders for insert to anon, authenticated with check (true);
-- السماح للإدارة فقط بقراءة وتحديث حالة الطلبات
create policy "Authenticated admin can manage orders" on public.orders for select to authenticated using (true);
create policy "Authenticated admin can update orders" on public.orders for update to authenticated using (true) with check (true);
