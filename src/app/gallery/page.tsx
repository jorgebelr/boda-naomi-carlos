'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Layers, 
  Clock, 
  Image as ImageIcon,
  FolderHeart,
  Heart,
  ArrowLeft,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAdminAuth } from '@/lib/auth-hook';

interface Album {
  id: string;
  name: string;
  slug: string;
  photoCount: number;
  coverUrl?: string;
}

interface Photo {
  id: string;
  album_id: string;
  url: string;
  taken_at: string;
  approved: boolean;
  album?: {
    name: string;
  };
}

// Datos mockeados premium para el Modo Demo (definidos fuera del componente)
const MOCK_ALBUMS: Album[] = [
  { id: '1', name: 'Mesa 4 (Primos)', slug: 'mesa-4-primos', photoCount: 2, coverUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&auto=format&fit=crop&q=80' },
  { id: '2', name: 'Pista de Baile', slug: 'pista-de-baile', photoCount: 2, coverUrl: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=600&auto=format&fit=crop&q=80' },
  { id: '3', name: 'Ceremonia', slug: 'ceremonia', photoCount: 1, coverUrl: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&auto=format&fit=crop&q=80' }
];

const MOCK_PHOTOS: Photo[] = [
  { id: 'p1', album_id: '1', url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1000&auto=format&fit=crop&q=80', taken_at: new Date(Date.now() - 3600000).toISOString(), approved: true, album: { name: 'Mesa 4 (Primos)' } },
  { id: 'p2', album_id: '1', url: 'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=1000&auto=format&fit=crop&q=80', taken_at: new Date(Date.now() - 7200000).toISOString(), approved: true, album: { name: 'Mesa 4 (Primos)' } },
  { id: 'p3', album_id: '2', url: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=1000&auto=format&fit=crop&q=80', taken_at: new Date(Date.now() - 10800000).toISOString(), approved: true, album: { name: 'Pista de Baile' } },
  { id: 'p4', album_id: '2', url: 'https://images.unsplash.com/photo-1549417229-aa67d3263c09?w=1000&auto=format&fit=crop&q=80', taken_at: new Date(Date.now() - 14400000).toISOString(), approved: true, album: { name: 'Pista de Baile' } },
  { id: 'p5', album_id: '3', url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1000&auto=format&fit=crop&q=80', taken_at: new Date(Date.now() - 18000000).toISOString(), approved: true, album: { name: 'Ceremonia' } }
];

export default function PublicGalleryPage() {
  const { user, loading: isAuthLoading } = useAdminAuth();
  
  const [activeTab, setActiveTab] = useState<'albums' | 'timeline'>('albums');
  const [albums, setAlbums] = useState<Album[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAlbumFilter, setSelectedAlbumFilter] = useState<string | null>(null);

  // Estado para el visualizador a pantalla completa (Lightbox)
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number | null>(null);
  
  const [isDemoMode, setIsDemoMode] = useState(true);

  useEffect(() => {
    // Comprobar variables
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (url && key && !url.includes('your-project-id')) {
      setIsDemoMode(false);
      fetchGalleryData();
    } else {
      setIsDemoMode(true);
      setAlbums(MOCK_ALBUMS);
      setPhotos(MOCK_PHOTOS);
      setIsLoading(false);
    }
  }, []);

  const fetchGalleryData = async () => {
    setIsLoading(true);
    try {
      // 1. Obtener todas las fotos aprobadas
      const { data: dbPhotos, error: photosError } = await supabase
        .from('photos')
        .select('*, album:albums(name)')
        .eq('approved', true)
        .order('taken_at', { ascending: false });

      if (photosError) throw photosError;

      const typedPhotos = (dbPhotos || []) as Photo[];
      setPhotos(typedPhotos);

      // 2. Obtener los álbumes correspondientes que contengan fotos aprobadas
      const { data: dbAlbums, error: albumsError } = await supabase
        .from('albums')
        .select('*')
        .order('name', { ascending: true });

      if (albumsError) throw albumsError;

      const computedAlbums = (dbAlbums || []).map(album => {
        const albumPhotos = typedPhotos.filter(p => p.album_id === album.id);
        return {
          id: album.id,
          name: album.name,
          slug: album.slug,
          photoCount: albumPhotos.length,
          coverUrl: albumPhotos[0]?.url || undefined
        };
      }).filter(album => album.photoCount > 0); // Omitimos álbumes vacíos en la galería pública

      setAlbums(computedAlbums);
    } catch (error) {
      console.error('Error cargando datos de galería pública:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrado de fotos para la vista de Álbum específico
  const displayedPhotos = selectedAlbumFilter
    ? photos.filter(p => p.album_id === selectedAlbumFilter)
    : photos;

  // Determinar la lista de fotos activa para el visualizador Lightbox
  const lightboxPhotos = activeTab === 'albums' ? displayedPhotos : photos;

  // Navegación en Lightbox
  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeLightboxIndex !== null && activeLightboxIndex > 0) {
      setActiveLightboxIndex(activeLightboxIndex - 1);
    }
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeLightboxIndex !== null && activeLightboxIndex < lightboxPhotos.length - 1) {
      setActiveLightboxIndex(activeLightboxIndex + 1);
    }
  };

  return (
    <main className="min-h-screen bg-[#fcfbfa] flex flex-col items-center justify-start py-8 px-4 pb-20">
      
      {/* Contenedor central - Mobile first */}
      <div className="w-full max-w-md flex flex-col gap-6 relative">

        {/* Botón flotante de Administrador (Detección de Sesión Inteligente) */}
        {!isAuthLoading && user && (
          <Link href="/admin/dashboard" className="fixed bottom-6 right-6 z-40 animate-bounce">
            <button className="bg-stone-900 text-stone-50 hover:bg-stone-850 px-4 py-3 rounded-full flex items-center gap-2 shadow-[0_8px_30px_rgb(0,0,0,0.15)] text-xs font-semibold border border-stone-800">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Administrar Fotos
            </button>
          </Link>
        )}
        
        {/* Encabezado e Invitación */}
        <header className="flex flex-col gap-4 relative">
          <Link href="/" className="inline-flex items-center gap-1 text-xs text-stone-400 hover:text-stone-700 transition-colors self-start ml-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver al inicio
          </Link>

          <div className="text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mb-3">
              <Heart className="w-6 h-6 text-stone-700 stroke-[1.5]" />
            </div>
            <h1 className="font-serif text-3xl italic text-stone-900 tracking-tight">
              Nuestros Momentos
            </h1>
            <p className="text-xs font-sans text-stone-400 tracking-widest uppercase mt-2">
              Galería Compartida de Boda
            </p>
          </div>
        </header>

        {/* Alerta de Modo Demo */}
        {isDemoMode && (
          <Card variant="glass" className="border-amber-200 bg-amber-50/70 p-4">
            <div className="flex gap-3">
              <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                  Modo Demostración Activo
                </h4>
                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                  Mostrando fotos de ejemplo. Configura tus claves de Supabase para ver las imágenes reales tomadas por los invitados.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Pestañas de Navegación de la Galería */}
        <nav className="flex gap-1 p-1 bg-stone-100/70 rounded-2xl w-full">
          <button
            onClick={() => { setActiveTab('albums'); setSelectedAlbumFilter(null); }}
            className={`
              flex-1 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 flex items-center justify-center gap-2
              ${activeTab === 'albums' 
                ? 'bg-white text-stone-900 shadow-sm' 
                : 'text-stone-500 hover:text-stone-900'}
            `}
          >
            <Layers className="w-3.5 h-3.5" />
            Carpetas
          </button>
          
          <button
            onClick={() => { setActiveTab('timeline'); setSelectedAlbumFilter(null); }}
            className={`
              flex-1 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 flex items-center justify-center gap-2
              ${activeTab === 'timeline' 
                ? 'bg-white text-stone-900 shadow-sm' 
                : 'text-stone-500 hover:text-stone-900'}
            `}
          >
            <Clock className="w-3.5 h-3.5" />
            Fotos
          </button>
        </nav>

        {/* Carga de Datos */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-stone-400">
            <svg className="animate-spin h-6 w-6 text-stone-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-xs uppercase tracking-wider font-semibold">Abriendo álbum...</span>
          </div>
        )}

        {/* ======================================================== */}
        {/* VISTA: ALBUMES (CARPETAS) */}
        {/* ======================================================== */}
        {activeTab === 'albums' && !isLoading && (
          <div className="flex flex-col gap-5 animate-fade-in">
            {selectedAlbumFilter === null ? (
              // 1. Mostrar cuadrícula de Carpetas/Álbumes
              albums.length === 0 ? (
                <Card variant="glass" className="text-center py-12 flex flex-col items-center justify-center gap-3">
                  <FolderHeart className="w-8 h-8 text-stone-300" />
                  <h3 className="font-serif text-lg text-stone-850">El álbum está vacío</h3>
                  <p className="text-xs text-stone-400 max-w-[260px]">
                    Las fotos subidas por los invitados se organizarán aquí. ¡Sé el primero en compartir!
                  </p>
                  <Link href="/upload" className="mt-2">
                    <Button variant="primary" size="sm">Subir Fotos</Button>
                  </Link>
                </Card>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {albums.map((album) => (
                    <Card 
                      key={album.id}
                      variant="default"
                      onClick={() => {
                        setSelectedAlbumFilter(album.id);
                      }}
                      className="p-0 overflow-hidden cursor-pointer hover:shadow-sm hover:border-stone-250 transition-all duration-300 rounded-3xl group flex flex-col bg-white"
                    >
                      <div className="aspect-[4/3] bg-stone-50 relative overflow-hidden">
                        {album.coverUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={album.coverUrl}
                            alt={album.name}
                            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-300">
                            <ImageIcon className="w-6 h-6 stroke-[1.2]" />
                          </div>
                        )}
                      </div>
                      
                      <div className="p-3.5 flex flex-col gap-0.5 bg-white">
                        <h4 className="text-xs font-bold text-stone-900 group-hover:text-stone-950 truncate">
                          {album.name}
                        </h4>
                        <p className="text-[10px] text-stone-400 uppercase tracking-widest font-semibold font-mono">
                          {album.photoCount} foto{album.photoCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              )
            ) : (
              // 2. Mostrar las fotos del álbum seleccionado DENTRO de la misma pestaña
              <div className="flex flex-col gap-4 animate-fade-in">
                {/* Botón cerrar/volver */}
                <button
                  onClick={() => setSelectedAlbumFilter(null)}
                  className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-900 transition-colors font-semibold self-start ml-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Volver a Carpetas</span>
                </button>

                {/* Cabecera del Álbum */}
                <div className="border-b border-stone-100 pb-3 flex justify-between items-end">
                  <div>
                    <h3 className="font-serif text-xl italic text-stone-900">
                      {albums.find(a => a.id === selectedAlbumFilter)?.name}
                    </h3>
                    <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider font-mono mt-0.5">
                      {displayedPhotos.length} foto{displayedPhotos.length !== 1 ? 's' : ''} en esta carpeta
                    </p>
                  </div>
                </div>

                {/* Cuadrícula de fotos del álbum */}
                <div className="grid grid-cols-2 gap-3.5">
                  {displayedPhotos.map((photo, index) => (
                    <Card
                      key={photo.id}
                      variant="default"
                      onClick={() => setActiveLightboxIndex(index)}
                      className="p-0 overflow-hidden cursor-pointer rounded-2xl aspect-square border border-stone-100 shadow-sm relative group hover:scale-[1.01] transition-transform duration-200"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt="Momento de boda"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/60 to-transparent text-white text-[9px] flex justify-between items-center opacity-90">
                        <span className="truncate font-semibold text-amber-250">📂 {photo.album?.name}</span>
                        <span className="font-mono">{new Date(photo.taken_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* VISTA: TIMELINE (FOTOS GENERALES) */}
        {/* ======================================================== */}
        {activeTab === 'timeline' && !isLoading && (
          <div className="flex flex-col gap-5 animate-fade-in">
            
            {/* Cabecera del timeline general */}
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Mostrando {photos.length} fotos en total
              </span>
            </div>

            {photos.length === 0 ? (
              <Card variant="glass" className="text-center py-12 flex flex-col items-center justify-center gap-3">
                <ImageIcon className="w-8 h-8 text-stone-300" />
                <h3 className="font-serif text-lg text-stone-850">Sin fotos en la boda</h3>
                <p className="text-xs text-stone-400 max-w-[260px]">
                  Las fotos subidas por los invitados se mostrarán cronológicamente aquí.
                </p>
              </Card>
            ) : (
              /* Cuadrícula responsiva de todas las fotos */
              <div className="grid grid-cols-2 gap-3.5">
                {photos.map((photo, index) => (
                  <Card
                    key={photo.id}
                    variant="default"
                    onClick={() => setActiveLightboxIndex(index)}
                    className="p-0 overflow-hidden cursor-pointer rounded-2xl aspect-square border border-stone-100 shadow-sm relative group hover:scale-[1.01] transition-transform duration-200"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt="Momento de boda"
                      className="w-full h-full object-cover"
                    />

                    {/* Información básica flotante */}
                    <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/60 to-transparent text-white text-[9px] flex justify-between items-center opacity-90">
                      <span className="truncate font-semibold text-amber-250">📂 {photo.album?.name || 'Boda'}</span>
                      <span className="font-mono">{new Date(photo.taken_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ======================================================== */}
      {/* VISUALIZADOR DE PANTALLA COMPLETA (LIGHTBOX) */}
      {/* ======================================================== */}
      {activeLightboxIndex !== null && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-between p-4 animate-fade-in"
          onClick={() => setActiveLightboxIndex(null)}
        >
          {/* Barra superior del Lightbox */}
          <div className="w-full max-w-lg flex justify-between items-center text-white py-2 z-10">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-amber-300">
                📂 {lightboxPhotos[activeLightboxIndex].album?.name || 'Carpeta'}
              </span>
              <span className="text-[10px] text-stone-400 font-mono">
                📅 {new Date(lightboxPhotos[activeLightboxIndex].taken_at).toLocaleDateString([], {day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'})}
              </span>
            </div>
            
            <button
              onClick={() => setActiveLightboxIndex(null)}
              className="p-2 rounded-full bg-white/10 text-stone-300 hover:text-white backdrop-blur-sm transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Área de Visualización Central */}
          <div className="w-full flex-1 flex items-center justify-center relative my-4">
            
            {/* Botón Izquierda */}
            {activeLightboxIndex > 0 && (
              <button
                onClick={handlePrevPhoto}
                className="absolute left-2 p-3 rounded-full bg-white/5 hover:bg-white/10 text-white backdrop-blur-sm transition-colors z-10"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Imagen Principal */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxPhotos[activeLightboxIndex].url}
              alt="Momento Boda Fullscreen"
              className="max-h-[70vh] max-w-full object-contain rounded-2xl shadow-2xl animate-scale-up"
              onClick={(e) => e.stopPropagation()} // Previene cerrar al hacer click en la foto
            />

            {/* Botón Derecha */}
            {activeLightboxIndex < lightboxPhotos.length - 1 && (
              <button
                onClick={handleNextPhoto}
                className="absolute right-2 p-3 rounded-full bg-white/5 hover:bg-white/10 text-white backdrop-blur-sm transition-colors z-10"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Barra inferior de navegación */}
          <div className="w-full max-w-xs text-center text-stone-500 text-[10px] uppercase tracking-widest pb-4 z-10">
            Foto {activeLightboxIndex + 1} de {lightboxPhotos.length}
          </div>
        </div>
      )}

    </main>
  );
}
