'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Image as ImageIcon,
  MessageSquareHeart,
  ArrowLeft,
  Lock,
  Heart
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

// Interface de Foto
interface Photo {
  id: string;
  storage_path: string;
  url: string;
  taken_at: string;
  approved: boolean;
  guest_name?: string | null;
  message?: string | null;
  metadata: {
    camera_make?: string;
    camera_model?: string;
    width?: number;
    height?: number;
    orientation?: string | number;
    [key: string]: unknown;
  };
  created_at: string;
}

export default function GalleryPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number | null>(null);

  // Detección automática de sesión de administrador para mostrar botón de acceso
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  useEffect(() => {
    // Comprobar si el administrador tiene una sesión activa
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAdminLoggedIn(!!session);
    });
  }, []);

  useEffect(() => {
    // Comprobar variables de conexión
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (url && key && !url.includes('your-project-id')) {
      setIsDemoMode(false);
      fetchGalleryPhotos();
    } else {
      setIsDemoMode(true);
      setPhotos(MOCK_PHOTOS);
      setIsLoading(false);
    }
  }, []);

  const fetchGalleryPhotos = async () => {
    setIsLoading(true);
    try {
      // Obtener todas las fotos aprobadas ordenadas de forma cronológica descendente (taken_at)
      const { data: dbPhotos, error } = await supabase
        .from('photos')
        .select('*')
        .eq('approved', true)
        .order('taken_at', { ascending: false });

      if (error) throw error;

      setPhotos((dbPhotos || []) as Photo[]);
    } catch (err: unknown) {
      console.error('Error cargando la galería cronológica:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Formateador robusto de fechas y horas locales independientes de zonas horarias
  const formatPhotoDate = (dateStr: string) => {
    if (!dateStr) return { time: '', date: '' };
    // Asegurar formato ISO
    const cleanStr = dateStr.replace(' ', 'T');
    // Forzamos a interpretar como UTC agregando 'Z' si no tiene offset
    const date = new Date(cleanStr.includes('Z') || cleanStr.includes('+') ? cleanStr : cleanStr + 'Z');
    
    if (isNaN(date.getTime())) {
      return { time: 'Sin fecha', date: 'Sin fecha' };
    }
    
    const time = date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true,
      timeZone: 'UTC' 
    });
    
    const dateFormatted = date.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'long', 
      timeZone: 'UTC' 
    });
    
    return { time, date: dateFormatted };
  };

  // Navegación en Lightbox
  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeLightboxIndex !== null && activeLightboxIndex > 0) {
      setActiveLightboxIndex(activeLightboxIndex - 1);
    }
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeLightboxIndex !== null && activeLightboxIndex < photos.length - 1) {
      setActiveLightboxIndex(activeLightboxIndex + 1);
    }
  };

  return (
    <main className="min-h-screen py-8 px-4 flex flex-col items-center justify-start bg-[#fcfbfa]">
      <div className="w-full max-w-md flex flex-col gap-6">
        
        {/* Barra superior de Navegación */}
        <div className="flex justify-between items-center px-1">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-700 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver al inicio</span>
          </Link>

          {/* Botón flotante para los Novios */}
          {isAdminLoggedIn ? (
            <Link href="/admin/dashboard">
              <Button variant="secondary" className="px-3.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Lock className="w-3 h-3 text-stone-700" />
                Panel Novios
              </Button>
            </Link>
          ) : (
            <Link href="/admin">
              <Button variant="ghost" className="px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 text-stone-400 hover:text-stone-700">
                <Lock className="w-3 h-3 text-stone-450" />
                Novios
              </Button>
            </Link>
          )}
        </div>

        {/* Encabezado Principal Premium */}
        <header className="text-center py-2 flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full bg-stone-50 border border-stone-100 flex items-center justify-center mb-1">
            <Heart className="w-5 h-5 text-stone-700 fill-stone-500/5 stroke-[1.2]" />
          </div>
          <h1 className="font-serif text-3xl italic text-stone-900 tracking-tight leading-tight">
            Naomi &amp; Carlos
          </h1>
          <p className="text-[10px] font-sans text-stone-400 tracking-widest uppercase font-bold mt-1">
            Galería Cronológica de Momentos
          </p>
        </header>

        {/* Badge Informativo de Demo */}
        {isDemoMode && (
          <Card variant="glass" className="border-amber-100 bg-amber-50/50 p-4 text-center">
            <p className="text-[11px] text-amber-700 leading-relaxed">
              <strong>Modo Demostración Activo:</strong> Viendo fotos simuladas. Configura Supabase en `.env.local` para cargar tus imágenes reales en tiempo real.
            </p>
          </Card>
        )}

        {/* Cargador */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-stone-400">
            <svg className="animate-spin h-6 w-6 text-stone-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-xs uppercase tracking-wider font-bold">Abriendo la galería...</span>
          </div>
        ) : photos.length === 0 ? (
          /* Galería Vacía */
          <Card variant="glass" className="text-center py-16 px-6 flex flex-col items-center justify-center gap-4 rounded-3xl border border-white/20">
            <ImageIcon className="w-10 h-10 text-stone-300 stroke-[1.2]" />
            <div>
              <h3 className="font-serif text-lg text-stone-850">El álbum está vacío</h3>
              <p className="text-xs text-stone-400 leading-relaxed max-w-[260px] mt-1.5">
                Las fotos compartidas por tus seres queridos aparecerán ordenadas por hora de captura. ¡Sé el primero en compartir!
              </p>
            </div>
            <Link href="/upload" className="mt-2 w-full max-w-[200px]">
              <Button variant="primary" className="w-full py-3.5 rounded-xl text-xs font-semibold">
                Subir fotos de la galería
              </Button>
            </Link>
          </Card>
        ) : (
          /* Timeline de fotos en Grid responsivo */
          <div className="flex flex-col gap-4 animate-fade-in">
            <div className="flex justify-between items-center px-1 border-b border-stone-100 pb-2.5">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                <Clock className="w-3.5 h-3.5" />
                {photos.length} momento{photos.length !== 1 ? 's' : ''} en total
              </span>
            </div>

            {/* Grid 2 Columnas */}
            <div className="grid grid-cols-2 gap-3.5">
              {photos.map((photo, index) => {
                const dateTime = formatPhotoDate(photo.taken_at);
                return (
                  <Card
                    key={photo.id}
                    variant="default"
                    onClick={() => setActiveLightboxIndex(index)}
                    className="p-0 overflow-hidden cursor-pointer rounded-2xl aspect-square border border-stone-150/75 shadow-sm relative group hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 bg-white"
                  >
                    {/* Imagen de timeline */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt="Momento de boda"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />

                    {/* Mensaje sutil si tiene dedicatoria */}
                    {photo.message && (
                      <div className="absolute top-2 right-2 p-1.5 rounded-full bg-black/45 backdrop-blur-[2px] text-white shadow-sm hover:scale-105 transition-transform">
                        <MessageSquareHeart className="w-3 h-3 fill-stone-100/10" />
                      </div>
                    )}

                    {/* Información sutil de firma y hora en el pie */}
                    <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/70 via-black/30 to-transparent text-white text-[9px] flex flex-col gap-0.5 justify-end opacity-95">
                      {photo.guest_name ? (
                        <span className="font-semibold text-amber-250 truncate">✍ {photo.guest_name}</span>
                      ) : (
                        <span className="font-semibold text-stone-200">✨ Invitado</span>
                      )}
                      <span className="font-mono text-[8px] text-stone-300">{dateTime.time}</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* ======================================================== */}
      {/* VISUALIZADOR DE PANTALLA COMPLETA (LIGHTBOX / GUESTBOOK) */}
      {/* ======================================================== */}
      {activeLightboxIndex !== null && (
        <div 
          className="fixed inset-0 z-50 bg-black/98 flex flex-col items-center justify-between p-4 animate-fade-in select-none"
          onClick={() => setActiveLightboxIndex(null)}
        >
          {/* Barra superior */}
          <div className="w-full max-w-lg flex justify-between items-center text-white py-2 z-10">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-amber-300 flex items-center gap-1">
                ✍ {photos[activeLightboxIndex].guest_name || 'Invitado de la Boda'}
              </span>
              <span className="text-[9px] text-stone-400 font-mono">
                📅 {formatPhotoDate(photos[activeLightboxIndex].taken_at).date} • {formatPhotoDate(photos[activeLightboxIndex].taken_at).time}
              </span>
            </div>
            
            <button
              onClick={() => setActiveLightboxIndex(null)}
              className="p-2 rounded-full bg-white/10 text-stone-300 hover:text-white backdrop-blur-sm transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Área Central de Visualización */}
          <div className="w-full flex-1 flex flex-col items-center justify-center relative my-4 gap-4">
            
            {/* Botón Izquierda */}
            {activeLightboxIndex > 0 && (
              <button
                onClick={handlePrevPhoto}
                className="absolute left-2 p-3 rounded-full bg-white/5 hover:bg-white/10 text-white backdrop-blur-sm transition-colors z-10 active:scale-95"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Imagen Principal */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[activeLightboxIndex].url}
              alt="Momento Boda Fullscreen"
              className="max-h-[60vh] max-w-full object-contain rounded-2xl shadow-2xl animate-scale-up border border-white/5"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Mensaje Visual de Felicitación (Tipo Tarjeta Flotante) */}
            {photos[activeLightboxIndex].message && (
              <div 
                className="w-full max-w-xs bg-white/10 border border-white/10 rounded-2xl p-4 flex flex-col gap-2 backdrop-blur-md text-white shadow-xl animate-scale-up mx-4 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-[8px] font-bold text-stone-450 uppercase tracking-widest flex items-center gap-1 font-sans">
                  <MessageSquareHeart className="w-3.5 h-3.5 text-amber-300" />
                  Dedicatoria para los novios
                </span>
                <p className="text-xs font-serif italic text-stone-100 leading-relaxed">
                  &ldquo;{photos[activeLightboxIndex].message}&rdquo;
                </p>
                {photos[activeLightboxIndex].guest_name && (
                  <span className="text-[9px] font-bold text-amber-300 font-mono text-right">
                    — {photos[activeLightboxIndex].guest_name}
                  </span>
                )}
              </div>
            )}

            {/* Botón Derecha */}
            {activeLightboxIndex < photos.length - 1 && (
              <button
                onClick={handleNextPhoto}
                className="absolute right-2 p-3 rounded-full bg-white/5 hover:bg-white/10 text-white backdrop-blur-sm transition-colors z-10 active:scale-95"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Barra inferior de navegación */}
          <div className="w-full max-w-xs text-center text-stone-500 text-[10px] uppercase tracking-widest pb-4 z-10 font-mono">
            Foto {activeLightboxIndex + 1} de {photos.length}
          </div>
        </div>
      )}

    </main>
  );
}

// Datos de simulación para el modo Demo
const MOCK_PHOTOS: Photo[] = [
  {
    id: 'p1',
    storage_path: 'mock/p1.jpg',
    url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1000&auto=format&fit=crop&q=80',
    taken_at: new Date(Date.now() - 3600000).toISOString(),
    approved: true,
    guest_name: 'Fam. Beltrán González',
    message: '¡Muchas felicidades a los novios más hermosos! Que este amor tan inmenso los guíe en cada paso de su nueva vida juntos. ¡Los queremos mucho!',
    metadata: {},
    created_at: new Date().toISOString()
  },
  {
    id: 'p2',
    storage_path: 'mock/p2.jpg',
    url: 'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=1000&auto=format&fit=crop&q=80',
    taken_at: new Date(Date.now() - 7200000).toISOString(),
    approved: true,
    guest_name: 'Sofía & Alejandro',
    message: 'Qué hermosa ceremonia. Verlos brillar juntos es una delicia. ¡Que viva el amor de Naomi y Carlos!',
    metadata: {},
    created_at: new Date().toISOString()
  },
  {
    id: 'p3',
    storage_path: 'mock/p3.jpg',
    url: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=1000&auto=format&fit=crop&q=80',
    taken_at: new Date(Date.now() - 10800000).toISOString(),
    approved: true,
    guest_name: 'Mesa 4 - Primos de Carlos',
    message: '¡Parranda total! Celebrando en grande por este matrimonio. Que no falte nunca el baile ni las risas.',
    metadata: {},
    created_at: new Date().toISOString()
  },
  {
    id: 'p4',
    storage_path: 'mock/p4.jpg',
    url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1000&auto=format&fit=crop&q=80',
    taken_at: new Date(Date.now() - 14400000).toISOString(),
    approved: true,
    guest_name: 'María Luisa (Tía de Naomi)',
    message: 'Mi niña hermosa Naomi, te ves radiante. Carlos, tienes en tus manos una joya preciosa. ¡Que Dios bendiga su matrimonio por siempre!',
    metadata: {},
    created_at: new Date().toISOString()
  }
];
