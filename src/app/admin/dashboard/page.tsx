'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  LogOut, 
  Layers, 
  Clock, 
  CheckCircle, 
  Trash2, 
  Eye, 
  EyeOff, 
  Image as ImageIcon,
  FolderHeart,
  BarChart3,
  AlertTriangle,
  Heart,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAdminAuth } from '@/lib/auth-hook';

// Interfaces locales
interface Album {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  photoCount?: number;
  coverUrl?: string;
}

interface Photo {
  id: string;
  album_id: string;
  storage_path: string;
  url: string;
  taken_at: string;
  approved: boolean;
  metadata: {
    camera_make?: string;
    camera_model?: string;
    width?: number;
    height?: number;
    orientation?: string | number;
    gps?: { lat: number; lng: number } | null;
    [key: string]: unknown;
  };
  created_at: string;
  album?: {
    name: string;
  };
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, loading, signOut } = useAdminAuth();

  const [activeTab, setActiveTab] = useState<'summary' | 'albums' | 'timeline' | 'moderation'>('summary');
  const [albums, setAlbums] = useState<Album[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estados de control administrativo
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);
  const [isActionPending, setIsActionPending] = useState<string | null>(null);
  const [selectedAlbumFilter, setSelectedAlbumFilter] = useState<string | null>(null);
  const [isConfirmingDeleteAlbum, setIsConfirmingDeleteAlbum] = useState(false);

  // Redirección si no está autenticado
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/admin');
    }
  }, [user, loading, router]);

  // Carga de datos
  const fetchDashboardData = async () => {
    setIsLoadingData(true);
    setErrorMsg(null);
    try {
      // 1. Cargar Álbumes
      const { data: dbAlbums, error: albumsError } = await supabase
        .from('albums')
        .select('*')
        .order('name', { ascending: true });

      if (albumsError) throw albumsError;

      // 2. Cargar Fotos con relación de álbum
      const { data: dbPhotos, error: photosError } = await supabase
        .from('photos')
        .select('*, album:albums(name)')
        .order('taken_at', { ascending: false });

      if (photosError) throw photosError;

      const typedPhotos = (dbPhotos || []) as Photo[];
      const typedAlbums = (dbAlbums || []).map(album => {
        const albumPhotos = typedPhotos.filter(p => p.album_id === album.id);
        return {
          ...album,
          photoCount: albumPhotos.length,
          coverUrl: albumPhotos[0]?.url || undefined
        };
      }) as Album[];

      setAlbums(typedAlbums);
      setPhotos(typedPhotos);
    } catch (err: unknown) {
      console.error('Error cargando datos del panel:', err);
      const error = err as Error;
      setErrorMsg(error.message || 'Error al obtener la información de Supabase. Revisa las políticas RLS y tablas.');
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  // 1. Acción: Alternar aprobación de foto
  const handleToggleApprove = async (id: string, currentApproved: boolean) => {
    setIsActionPending(id);
    try {
      const nextState = !currentApproved;
      const { error } = await supabase
        .from('photos')
        .update({ approved: nextState })
        .eq('id', id);

      if (error) throw error;

      // Actualizar estado local reactivamente
      setPhotos(prev => 
        prev.map(p => p.id === id ? { ...p, approved: nextState } : p)
      );
    } catch (err: unknown) {
      console.error('Error al moderar la foto:', err);
      alert('No se pudo cambiar el estado de la foto. Revisa tus permisos.');
    } finally {
      setIsActionPending(null);
    }
  };

  // 2. Acción: Borrar foto
  const handleDeletePhoto = async (id: string, storagePath: string) => {
    setIsActionPending(id);
    try {
      const photoObj = photos.find(p => p.id === id);
      const albumId = photoObj?.album_id;

      // A. Borrar de Supabase Storage
      const { error: storageError } = await supabase.storage
        .from('wedding-photos')
        .remove([storagePath]);

      if (storageError) {
        console.warn('Advertencia al borrar de Storage (podría no existir el archivo físico):', storageError);
      }

      // B. Borrar de la Base de Datos
      const { error: dbError } = await supabase
        .from('photos')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      // C. Actualizar estado local reactivamente
      setPhotos(prev => prev.filter(p => p.id !== id));
      
      // D. Verificar si la carpeta quedó vacía
      const remainingPhotos = photos.filter(p => p.album_id === albumId && p.id !== id);
      
      if (albumId && remainingPhotos.length === 0) {
        // La carpeta quedó vacía, la eliminamos automáticamente de la base de datos
        const { error: albumDeleteError } = await supabase
          .from('albums')
          .delete()
          .eq('id', albumId);
          
        if (albumDeleteError) {
          console.error('Error al borrar carpeta vacía automáticamente:', albumDeleteError);
        }
        
        // Quitar el álbum del estado
        setAlbums(prev => prev.filter(a => a.id !== albumId));
        
        // Si estábamos viendo ese álbum, regresamos a la vista general de carpetas
        if (selectedAlbumFilter === albumId) {
          setSelectedAlbumFilter(null);
        }
      } else {
        // Recalcular conteos de álbumes si no fue eliminado
        setAlbums(prev => 
          prev.map(album => {
            const newPhotos = photos.filter(p => p.album_id === album.id && p.id !== id);
            return {
              ...album,
              photoCount: newPhotos.length,
              coverUrl: newPhotos[0]?.url || undefined
            };
          })
        );
      }

      setPhotoToDelete(null);
    } catch (err: unknown) {
      console.error('Error al eliminar la foto:', err);
      alert('Error al intentar eliminar la foto de la base de datos.');
    } finally {
      setIsActionPending(null);
    }
  };

  // 3. Acción: Borrar álbum completo (carpeta y todas sus fotos en DB + Storage)
  const handleDeleteAlbum = async () => {
    if (!selectedAlbumFilter) return;
    setIsActionPending('delete-album');
    try {
      const albumId = selectedAlbumFilter;
      const targetAlbumPhotos = photos.filter(p => p.album_id === albumId);
      
      // A. Eliminar fotos físicas en Supabase Storage
      if (targetAlbumPhotos.length > 0) {
        const storagePaths = targetAlbumPhotos.map(p => p.storage_path);
        const { error: storageError } = await supabase.storage
          .from('wedding-photos')
          .remove(storagePaths);

        if (storageError) {
          console.warn('Advertencia al vaciar Storage del álbum:', storageError);
        }
      }

      // B. Eliminar el álbum de la base de datos
      // (Cascada se encargará de borrar todas las filas correspondientes en 'photos')
      const { error: dbError } = await supabase
        .from('albums')
        .delete()
        .eq('id', albumId);

      if (dbError) throw dbError;

      // C. Actualizar estado local reactivamente
      setPhotos(prev => prev.filter(p => p.album_id !== albumId));
      setAlbums(prev => prev.filter(a => a.id !== albumId));
      
      // D. Salir del álbum e ir a vista general
      setSelectedAlbumFilter(null);
      setIsConfirmingDeleteAlbum(false);
    } catch (err: unknown) {
      console.error('Error al eliminar la carpeta completa:', err);
      alert('Error al intentar eliminar la carpeta completa de la base de datos.');
    } finally {
      setIsActionPending(null);
    }
  };

  if (loading || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#fcfbfa]">
        <div className="flex flex-col items-center gap-3 text-stone-500">
          <svg className="animate-spin h-6 w-6 text-stone-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-xs uppercase tracking-wider">Cargando panel...</span>
        </div>
      </main>
    );
  }

  // Filtrado de fotos según pestaña activa y filtros locales
  const unmoderatedPhotos = photos.filter(p => !p.approved);
  
  // Fotos del álbum seleccionado (para la vista interna del álbum)
  const albumPhotos = selectedAlbumFilter
    ? photos.filter(p => p.album_id === selectedAlbumFilter)
    : [];

  return (
    <main className="min-h-screen bg-[#fcfbfa] flex flex-col">
      
      {/* Encabezado Administrativo Premium */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-stone-100 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-stone-900 flex items-center justify-center text-white">
            <Heart className="w-4 h-4 text-amber-300 fill-amber-300/10" />
          </div>
          <div>
            <h1 className="font-serif text-lg italic text-stone-950">Panel de Bodas</h1>
            <p className="text-[10px] text-stone-400 font-medium uppercase tracking-widest">
              Naomi &amp; Carlos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={signOut}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-500 hover:text-stone-950 hover:bg-stone-50 transition-all duration-200"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>
        </div>
      </header>

      {/* Cuerpo principal con pestañas y contenido */}
      <div className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        
        {/* Pestañas de Navegación Fluidas */}
        <nav className="flex gap-1.5 p-1 bg-stone-100/75 rounded-2xl self-start w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => { setActiveTab('summary'); setSelectedAlbumFilter(null); }}
            className={`
              flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 whitespace-nowrap
              ${activeTab === 'summary' 
                ? 'bg-white text-stone-900 shadow-sm' 
                : 'text-stone-500 hover:text-stone-900'}
            `}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Resumen
          </button>
          
          <button
            onClick={() => { setActiveTab('albums'); setSelectedAlbumFilter(null); }}
            className={`
              flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 whitespace-nowrap
              ${activeTab === 'albums' 
                ? 'bg-white text-stone-900 shadow-sm' 
                : 'text-stone-500 hover:text-stone-900'}
            `}
          >
            <Layers className="w-3.5 h-3.5" />
            Álbumes ({albums.length})
          </button>

          <button
            onClick={() => { setActiveTab('timeline'); setSelectedAlbumFilter(null); }}
            className={`
              flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 whitespace-nowrap
              ${activeTab === 'timeline' 
                ? 'bg-white text-stone-900 shadow-sm' 
                : 'text-stone-500 hover:text-stone-900'}
            `}
          >
            <Clock className="w-3.5 h-3.5" />
            Timeline ({photos.length})
          </button>

          <button
            onClick={() => { setActiveTab('moderation'); setSelectedAlbumFilter(null); }}
            className={`
              flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 whitespace-nowrap relative
              ${activeTab === 'moderation' 
                ? 'bg-white text-stone-900 shadow-sm' 
                : 'text-stone-500 hover:text-stone-900'}
            `}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Moderación
            {unmoderatedPhotos.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold">
                {unmoderatedPhotos.length}
              </span>
            )}
          </button>
        </nav>

        {/* Notificaciones de Error del Servidor */}
        {errorMsg && (
          <Card variant="glass" className="border-red-200 bg-red-50/70 p-4">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-red-800 uppercase tracking-wider">
                  Error de Conexión de Datos
                </h4>
                <p className="text-xs text-red-700 mt-1 leading-relaxed">
                  {errorMsg}
                </p>
                <Button onClick={fetchDashboardData} variant="outline" size="sm" className="mt-3 py-1.5 text-xs">
                  Reintentar Carga
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Contenido Dinámico de Pestañas */}
        
        {/* ======================================================== */}
        {/* PESTAÑA: RESUMEN (SUMMARY) */}
        {/* ======================================================== */}
        {activeTab === 'summary' && !isLoadingData && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 animate-fade-in">
            {/* Tarjeta 1: Total Fotos */}
            <Card variant="default" className="flex items-center justify-between p-6 rounded-3xl">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Total Fotos Subidas</span>
                <span className="font-serif text-4xl text-stone-900 font-light">{photos.length}</span>
              </div>
              <div className="w-12 h-12 bg-stone-50 rounded-2xl flex items-center justify-center border border-stone-100">
                <ImageIcon className="w-5 h-5 text-stone-600" />
              </div>
            </Card>

            {/* Tarjeta 2: Total Álbumes */}
            <Card variant="default" className="flex items-center justify-between p-6 rounded-3xl">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Carpetas Creadas</span>
                <span className="font-serif text-4xl text-stone-900 font-light">{albums.length}</span>
              </div>
              <div className="w-12 h-12 bg-stone-50 rounded-2xl flex items-center justify-center border border-stone-100">
                <FolderHeart className="w-5 h-5 text-stone-600" />
              </div>
            </Card>

            {/* Tarjeta 3: Pendientes de moderar */}
            <Card variant="default" className="flex items-center justify-between p-6 rounded-3xl">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Fotos sin moderar</span>
                <span className={`font-serif text-4xl font-light ${unmoderatedPhotos.length > 0 ? 'text-amber-600' : 'text-stone-900'}`}>
                  {unmoderatedPhotos.length}
                </span>
              </div>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${unmoderatedPhotos.length > 0 ? 'bg-amber-50 border-amber-100' : 'bg-stone-50 border-stone-100'}`}>
                <CheckCircle className={`w-5 h-5 ${unmoderatedPhotos.length > 0 ? 'text-amber-600' : 'text-stone-600'}`} />
              </div>
            </Card>

            {/* Accesos rápidos */}
            <Card variant="glass" className="sm:col-span-3 p-8 flex flex-col gap-4 rounded-3xl">
              <h3 className="font-serif text-xl italic text-stone-900">Acciones y Guías Rápidas</h3>
              <p className="text-sm text-stone-500 leading-relaxed">
                ¡Bienvenidos a la administración de su boda! Desde aquí pueden controlar qué fotos aparecen en el álbum general. Recuerden que los invitados suben fotos escaneando el código QR asignado a las mesas sin crearse cuenta.
              </p>
              <div className="flex flex-wrap gap-3 mt-2">
                <Button onClick={() => setActiveTab('timeline')} variant="primary" size="sm" className="rounded-xl">
                  Ir al Timeline Completo
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
                <Button onClick={() => setActiveTab('moderation')} variant="secondary" size="sm" className="rounded-xl">
                  Ver Fotos sin Moderar ({unmoderatedPhotos.length})
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* ======================================================== */}
        {/* PESTAÑA: ÁLBUMES (ALBUMS) */}
        {/* ======================================================== */}
        {activeTab === 'albums' && !isLoadingData && (
          <div className="flex flex-col gap-6 animate-fade-in">
            {selectedAlbumFilter === null ? (
              // 1. Vista de carpetas generales
              albums.length === 0 ? (
                <Card variant="glass" className="text-center py-12 flex flex-col items-center justify-center gap-3">
                  <FolderHeart className="w-8 h-8 text-stone-300" />
                  <h3 className="font-serif text-lg text-stone-850">No hay carpetas creadas aún</h3>
                  <p className="text-xs text-stone-400 max-w-[280px]">
                    En cuanto los invitados suban fotos y agrupen por nombre (ej: &quot;Mesa 4&quot;), los álbumes se verán listados aquí.
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {albums.map((album) => (
                    <Card 
                      key={album.id}
                      variant="default"
                      onClick={() => {
                        setSelectedAlbumFilter(album.id);
                      }}
                      className="p-0 overflow-hidden cursor-pointer hover:shadow-md hover:border-stone-250 transition-all duration-300 rounded-3xl group flex flex-col bg-white"
                    >
                      {/* Cover Photo */}
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
                      
                      {/* Album Info */}
                      <div className="p-4 flex flex-col gap-0.5 bg-white">
                        <h4 className="text-sm font-semibold text-stone-900 group-hover:text-stone-950 truncate">
                          {album.name}
                        </h4>
                        <p className="text-[11px] text-stone-400 uppercase tracking-wider font-semibold">
                          {album.photoCount} foto{album.photoCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              )
            ) : (
              // 2. Vista INTERNA del álbum seleccionado con controles de administración
              <div className="flex flex-col gap-5 animate-fade-in">
                {/* Botón de cerrar álbum / volver */}
                <button
                  onClick={() => setSelectedAlbumFilter(null)}
                  className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-900 transition-colors font-semibold self-start ml-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Volver a Carpetas</span>
                </button>

                {/* Cabecera del Álbum */}
                <div className="border-b border-stone-100 pb-3 flex justify-between items-end gap-4">
                  <div>
                    <h3 className="font-serif text-xl italic text-stone-900">
                      {albums.find(a => a.id === selectedAlbumFilter)?.name}
                    </h3>
                    <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider font-mono mt-0.5">
                      {albumPhotos.length} foto{albumPhotos.length !== 1 ? 's' : ''} en esta carpeta
                    </p>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsConfirmingDeleteAlbum(true)}
                    className="rounded-xl border-red-200 text-red-650 hover:bg-red-50 hover:border-red-300 py-2 flex items-center gap-1.5 shrink-0"
                    disabled={isActionPending !== null}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Borrar Carpeta
                  </Button>
                </div>

                {/* Grid de fotos del álbum */}
                {albumPhotos.length === 0 ? (
                  <Card variant="glass" className="text-center py-12 flex flex-col items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-stone-300 mb-2" />
                    <p className="text-xs text-stone-400">Esta carpeta no contiene imágenes.</p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                    {albumPhotos.map((photo) => (
                      <Card
                        key={photo.id}
                        variant="default"
                        className="p-0 overflow-hidden rounded-3xl relative group border border-stone-100 shadow-sm"
                      >
                        {/* Foto */}
                        <div className="aspect-square bg-stone-100 relative overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photo.url}
                            alt="Foto de la boda"
                            className="w-full h-full object-cover"
                          />

                          {/* Botón flotante de borrado */}
                          <button
                            onClick={() => setPhotoToDelete(photo.id)}
                            disabled={isActionPending !== null}
                            className="absolute top-2.5 right-2.5 p-2 bg-black/40 hover:bg-red-650/90 rounded-full text-white backdrop-blur-sm transition-all duration-200 hover:scale-105"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Badge de aprobación */}
                          <div className="absolute top-2.5 left-2.5">
                            <button
                              onClick={() => handleToggleApprove(photo.id, photo.approved)}
                              disabled={isActionPending !== null}
                              className={`
                                px-2 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 backdrop-blur-sm transition-colors duration-200
                                ${photo.approved 
                                  ? 'bg-emerald-500/70 text-white' 
                                  : 'bg-amber-500/80 text-white hover:bg-emerald-500/80'}
                              `}
                            >
                              {photo.approved ? (
                                <>
                                  <Eye className="w-3 h-3" />
                                  Visible
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3 h-3" />
                                  Oculta
                                </>
                              )}
                            </button>
                          </div>

                          {/* Info flotante */}
                          <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-black/40 backdrop-blur-[2px] text-white p-2 rounded-2xl text-[10px] font-sans flex flex-col gap-0.5">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-amber-250">📂 {photo.album?.name || 'Carpeta'}</span>
                              <span className="font-mono text-[9px]">📅 {new Date(photo.taken_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                            <span className="text-[8px] text-stone-300 font-mono truncate">
                              {new Date(photo.taken_at).toLocaleDateString([], {day: 'numeric', month: 'short', year: 'numeric'})}
                            </span>
                          </div>
                        </div>

                        {/* EXIF details */}
                        {(photo.metadata?.camera_make || photo.metadata?.camera_model || photo.metadata?.width) && (
                          <div className="p-3 bg-stone-50 border-t border-stone-100 flex flex-col gap-0.5 text-[10px] text-stone-500 font-mono">
                            {photo.metadata.camera_model && (
                              <div className="truncate">📷 {photo.metadata.camera_make} {photo.metadata.camera_model}</div>
                            )}
                            {photo.metadata.width && photo.metadata.height && (
                              <div>📐 {photo.metadata.width}x{photo.metadata.height}px</div>
                            )}
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* PESTAÑAS: TIMELINE (GENERAL) / MODERACIÓN */}
        {/* ======================================================== */}
        {(activeTab === 'timeline' || activeTab === 'moderation') && !isLoadingData && (
          <div className="flex flex-col gap-6 animate-fade-in">
            
            {/* Header del Feed */}
            <div className="flex justify-between items-center border-b border-stone-100 pb-4">
              <div>
                <h3 className="font-serif text-xl italic text-stone-900">
                  {activeTab === 'moderation' ? 'Fotos Pendientes de Aprobación' : 'Timeline de la Boda'}
                </h3>
                <p className="text-xs text-stone-400 mt-1">
                  {activeTab === 'moderation' 
                    ? `Mostrando ${unmoderatedPhotos.length} fotos ocultas` 
                    : `Mostrando las ${photos.length} fotos en total ordenadas por fecha EXIF`}
                </p>
              </div>
            </div>

            {/* Caso de Feed vacío */}
            {((activeTab === 'timeline' ? photos.length : unmoderatedPhotos.length) === 0) ? (
              <Card variant="glass" className="text-center py-12 flex flex-col items-center justify-center gap-3">
                <ImageIcon className="w-8 h-8 text-stone-300" />
                <h3 className="font-serif text-lg text-stone-850">No hay fotos encontradas</h3>
                <p className="text-xs text-stone-400 max-w-[280px]">
                  {activeTab === 'moderation' 
                    ? '¡Excelente! No hay fotos pendientes de moderar.' 
                    : 'Las fotos subidas por los invitados se mostrarán cronológicamente aquí.'}
                </p>
              </Card>
            ) : (
              /* Grid de fotos */
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                {(activeTab === 'timeline' ? photos : unmoderatedPhotos).map((photo) => (
                  <Card
                    key={photo.id}
                    variant="default"
                    className="p-0 overflow-hidden rounded-3xl relative group border border-stone-100 shadow-sm"
                  >
                    {/* Foto */}
                    <div className="aspect-square bg-stone-100 relative overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt="Foto de la boda"
                        className="w-full h-full object-cover"
                      />

                      {/* Botón flotante de borrado */}
                      <button
                        onClick={() => setPhotoToDelete(photo.id)}
                        disabled={isActionPending !== null}
                        className="absolute top-2.5 right-2.5 p-2 bg-black/40 hover:bg-red-650/90 rounded-full text-white backdrop-blur-sm transition-all duration-200 hover:scale-105"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Badge de estado de aprobación */}
                      <div className="absolute top-2.5 left-2.5">
                        <button
                          onClick={() => handleToggleApprove(photo.id, photo.approved)}
                          disabled={isActionPending !== null}
                          className={`
                            px-2 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 backdrop-blur-sm transition-colors duration-200
                            ${photo.approved 
                              ? 'bg-emerald-500/70 text-white' 
                              : 'bg-amber-500/80 text-white hover:bg-emerald-500/80'}
                          `}
                        >
                          {photo.approved ? (
                            <>
                              <Eye className="w-3 h-3" />
                              Visible
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3" />
                              Oculta
                            </>
                          )}
                        </button>
                      </div>

                      {/* Info de captura flotante */}
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-black/40 backdrop-blur-[2px] text-white p-2 rounded-2xl text-[10px] font-sans flex flex-col gap-0.5">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-amber-250">📂 {photo.album?.name || 'Carpeta'}</span>
                          <span className="font-mono text-[9px]">📅 {new Date(photo.taken_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        {/* Fecha larga */}
                        <span className="text-[8px] text-stone-300 font-mono truncate">
                          {new Date(photo.taken_at).toLocaleDateString([], {day: 'numeric', month: 'short', year: 'numeric'})}
                        </span>
                      </div>
                    </div>

                    {/* Controles de cámara EXIF detallados (Hover) */}
                    {(photo.metadata?.camera_make || photo.metadata?.camera_model || photo.metadata?.width) && (
                      <div className="p-3 bg-stone-50 border-t border-stone-100 flex flex-col gap-0.5 text-[10px] text-stone-500 font-mono">
                        {photo.metadata.camera_model && (
                          <div className="truncate">📷 {photo.metadata.camera_make} {photo.metadata.camera_model}</div>
                        )}
                        {photo.metadata.width && photo.metadata.height && (
                          <div>📐 {photo.metadata.width}x{photo.metadata.height}px</div>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* CARGANDO ESTADOS DE DATOS */}
        {/* ======================================================== */}
        {isLoadingData && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-stone-400 animate-pulse">
            <svg className="animate-spin h-6 w-6 text-stone-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-xs uppercase tracking-wider font-semibold">Cargando base de datos...</span>
          </div>
        )}

      </div>

      {/* Modal de Confirmación de Borrado */}
      {photoToDelete && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <Card variant="glass" className="max-w-xs w-full text-center p-6 flex flex-col gap-4 animate-scale-up">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-650 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg text-stone-950">¿Eliminar Foto?</h3>
              <p className="text-xs text-stone-500 mt-2 leading-relaxed">
                Esta acción es permanente. Borrará la foto de tu base de datos y de tu almacenamiento de Supabase Storage.
              </p>
            </div>
            <div className="flex gap-2.5 mt-2">
              <Button
                onClick={() => setPhotoToDelete(null)}
                variant="secondary"
                size="sm"
                className="flex-1 rounded-xl py-2.5"
                disabled={isActionPending !== null}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  const target = photos.find(p => p.id === photoToDelete);
                  if (target) handleDeletePhoto(target.id, target.storage_path);
                }}
                variant="danger"
                size="sm"
                className="flex-1 rounded-xl py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white"
                isLoading={isActionPending !== null}
              >
                Eliminar
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal de Confirmación de Borrado de Álbum Completo */}
      {isConfirmingDeleteAlbum && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <Card variant="glass" className="max-w-xs w-full text-center p-6 flex flex-col gap-4 animate-scale-up">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-650 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg text-stone-950">¿Eliminar Carpeta?</h3>
              <p className="text-xs text-stone-500 mt-2 leading-relaxed">
                Esta acción eliminará la carpeta **&quot;{albums.find(a => a.id === selectedAlbumFilter)?.name}&quot;** y **todas las {albumPhotos.length} fotos** que contiene dentro, tanto de la base de datos como de Supabase Storage. Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex gap-2.5 mt-2">
              <Button
                onClick={() => setIsConfirmingDeleteAlbum(false)}
                variant="secondary"
                size="sm"
                className="flex-1 rounded-xl py-2.5"
                disabled={isActionPending !== null}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleDeleteAlbum}
                variant="danger"
                size="sm"
                className="flex-1 rounded-xl py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white"
                isLoading={isActionPending === 'delete-album'}
              >
                Eliminar Todo
              </Button>
            </div>
          </Card>
        </div>
      )}

    </main>
  );
}
