-- ==========================================
-- ESQUEMA DE BASE DE DATOS - BODA COLLAB ALBUM
-- Ejecutar este script en la consola SQL de Supabase
-- ==========================================

-- Habilitar extensión para generación de UUIDs
create extension if not exists "uuid-ossp";

-- ==========================================
-- 1. TABLA DE ÁLBUMES (CARPETAS)
-- ==========================================
create table if not exists public.albums (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Asegurar que no tengamos nombres de álbumes duplicados exactos
  constraint unique_album_name unique (name)
);
-- Habilitar Row Level Security (RLS)
alter table public.albums enable row level security;

-- Políticas de Seguridad para albums
create policy "Allow public read to albums" 
  on public.albums for select 
  using (true);

create policy "Allow public insert to albums" 
  on public.albums for insert 
  with check (true);

create policy "Allow admin full access to albums" 
  on public.albums for all 
  to authenticated 
  using (true) 
  with check (true);


-- ==========================================
-- 2. TABLA DE FOTOS
-- ==========================================
create table if not exists public.photos (
  id uuid default gen_random_uuid() primary key,
  album_id uuid references public.albums(id) on delete cascade not null,
  storage_path text not null, -- Ruta dentro del bucket de Supabase Storage
  url text not null,          -- URL pública accesible desde la web
  taken_at timestamp with time zone not null, -- Fecha original de captura (EXIF) o de subida
  approved boolean default true not null, -- Moderación: aprobada por defecto
  metadata jsonb default '{}'::jsonb not null, -- Guardar datos de cámara, resolución, etc.
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar Row Level Security (RLS)
alter table public.photos enable row level security;

-- Políticas de Seguridad para photos
create policy "Allow public read to photos" 
  on public.photos for select 
  using (true);

create policy "Allow public insert to photos" 
  on public.photos for insert 
  with check (true);

create policy "Allow admin full access to photos" 
  on public.photos for all 
  to authenticated 
  using (true) 
  with check (true);

-- Índices de rendimiento
create index if not exists photos_album_id_idx on public.photos(album_id);
create index if not exists photos_taken_at_idx on public.photos(taken_at desc);
create index if not exists photos_approved_idx on public.photos(approved);


-- ==========================================
-- 3. CONFIGURACIÓN DEL BUCKET DE STORAGE
-- ==========================================
-- Nota: En algunas instancias autohospedadas o configuraciones estrictas, 
-- puede ser necesario crear el bucket desde el dashboard de Supabase.
-- Este script inserta la configuración si es posible.

insert into storage.buckets (id, name, public) 
values ('wedding-photos', 'wedding-photos', true)
on conflict (id) do nothing;

-- Políticas de Seguridad para Storage (wedding-photos)
-- Permite que cualquiera pueda subir archivos al bucket
create policy "Allow public upload to wedding-photos" 
  on storage.objects for insert 
  with check (bucket_id = 'wedding-photos');

-- Permite que cualquiera pueda ver los archivos públicos
create policy "Allow public read from wedding-photos" 
  on storage.objects for select 
  using (bucket_id = 'wedding-photos');

-- Permite control total a los usuarios autenticados (novios)
create policy "Allow admin full control on wedding-photos" 
  on storage.objects for all 
  to authenticated 
  using (bucket_id = 'wedding-photos')
  with check (bucket_id = 'wedding-photos');
