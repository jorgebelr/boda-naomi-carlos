-- ==========================================
-- NUEVO ESQUEMA DE BASE DE DATOS - BODA COLLAB ALBUM (SIN CARPETAS)
-- Ejecutar este script en la consola SQL de Supabase para reiniciar la base de datos
-- ==========================================

-- Habilitar extensión para generación de UUIDs
create extension if not exists "uuid-ossp";

-- Eliminar tablas anteriores si existen (limpieza en cascada)
drop table if exists public.photos cascade;
drop table if exists public.albums cascade;

-- ==========================================
-- TABLA DE FOTOS (TODAS EN UN ÚNICO TIMELINE CRONOLÓGICO)
-- ==========================================
create table public.photos (
  id uuid default gen_random_uuid() primary key,
  storage_path text not null, -- Ruta dentro del bucket de Supabase Storage
  url text not null,          -- URL pública accesible desde la web
  taken_at timestamp without time zone not null, -- Fecha original de captura (EXIF) en hora local de la boda
  approved boolean default true not null, -- Moderación: aprobada por defecto
  guest_name text,            -- Nombre del invitado/familia (opcional)
  message text,               -- Mensaje de felicitación para los novios (opcional)
  metadata jsonb default '{}'::jsonb not null, -- Datos EXIF de la cámara, dimensiones, etc.
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
create index if not exists photos_taken_at_idx on public.photos(taken_at desc);
create index if not exists photos_approved_idx on public.photos(approved);

-- ==========================================
-- CONFIGURACIÓN DEL BUCKET DE STORAGE
-- ==========================================
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
