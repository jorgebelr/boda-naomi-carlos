'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  LogOut, 
  Clock, 
  CheckCircle, 
  Trash2, 
  Eye, 
  EyeOff, 
  Image as ImageIcon,
  BarChart3,
  AlertTriangle,
  Heart,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  X,
  MessageSquareHeart,
  Camera
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAdminAuth } from '@/lib/auth-hook';

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
    gps?: { lat: number; lng: number } | null;
    [key: string]: unknown;
  };
  created_at: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, loading, signOut } = useAdminAuth();

  const [activeTab, setActiveTab] = useState<'summary' | 'timeline' | 'moderation'>('summary');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estados de control administrativo
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);
  const [isActionPending, setIsActionPending] = useState<string | null>(null);
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number | null>(null);

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
      // Cargar todas las Fotos ordenadas cronológicamente descendente
      const { data: dbPhotos, error: photosError } = await supabase
        .from('photos')
        .select('*')
        .order('taken_at', { ascending: false });

      if (photosError) throw photosError;

      setPhotos((dbPhotos || []) as Photo[]);
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

  // Formateador robusto de fechas y horas locales independientes de zonas horarias (UTC-trick)
  const formatPhotoDate = (dateStr: string) => {
    if (!dateStr) return { time: '', date: '' };
    const cleanStr = dateStr.replace(' ', 'T');
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

  // 1. Acción: Alternar aprobación de foto (Visible/Oculta) desde la cuadrícula
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
      
      // D. Cerrar Lightbox y Modal
      setActiveLightboxIndex(null);
      setPhotoToDelete(null);
    } catch (err: unknown) {
      console.error('Error al eliminar la foto:', err);
      alert('Error al intentar eliminar la foto de la base de datos.');
    } finally {
      setIsActionPending(null);
    }
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
    const activePhotos = activeTab === 'moderation' ? unmoderatedPhotos : photos;
    if (activeLightboxIndex !== null && activeLightboxIndex < activePhotos.length - 1) {
      setActiveLightboxIndex(activeLightboxIndex + 1);
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
          <span className="text-xs uppercase tracking-wider font-semibold">Cargando panel...</span>
        </div>
      </main>
    );
  }

  // Filtrados según pestañas activas
  const unmoderatedPhotos = photos.filter(p => !p.approved);
  const photosWithMessages = photos.filter(p => p.message && p.message.trim());
  const activeTimelinePhotos = activeTab === 'moderation' ? unmoderatedPhotos : photos;

  return (
    <main className="min-h-screen bg-[#fcfbfa] flex flex-col">
      
      {/* Encabezado Administrativo Premium */}
      <header className="sticky top-0 z-45 bg-white/80 backdrop-blur-md border-b border-stone-100 px-6 py-4 flex justify-between items-center">
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

      {/* Cuerpo principal */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        
        {/* Pestañas de Navegación Fluidas (Sin álbumes) */}
        <nav className="flex gap-1.5 p-1 bg-stone-100/75 rounded-2xl self-start w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('summary')}
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
            onClick={() => setActiveTab('timeline')}
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
            onClick={() => setActiveTab('moderation')}
            className={`
              flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 whitespace-nowrap relative
              ${activeTab === 'moderation' 
                ? 'bg-white text-stone-900 shadow-sm' 
                : 'text-stone-500 hover:text-stone-900'}
            `}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Ocultas / Moderación
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

        {/* Contenido de Pestañas */}
        
        {/* ======================================================== */}
        {/* PESTAÑA: RESUMEN (SUMMARY) */}
        {/* ======================================================== */}
        {activeTab === 'summary' && !isLoadingData && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 animate-fade-in">
            {/* Tarjeta 1: Total Fotos */}
            <Card variant="default" className="flex items-center justify-between p-6 rounded-3xl bg-white shadow-sm border border-stone-150/75">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Total Fotos</span>
                <span className="font-serif text-4xl text-stone-900 font-light">{photos.length}</span>
              </div>
              <div className="w-11 h-11 bg-stone-50 rounded-2xl flex items-center justify-center border border-stone-100">
                <ImageIcon className="w-5 h-5 text-stone-600" />
              </div>
            </Card>

            {/* Tarjeta 2: Fotos con mensaje */}
            <Card variant="default" className="flex items-center justify-between p-6 rounded-3xl bg-white shadow-sm border border-stone-150/75">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Dedicatorias</span>
                <span className="font-serif text-4xl text-stone-900 font-light">{photosWithMessages.length}</span>
              </div>
              <div className="w-11 h-11 bg-stone-50 rounded-2xl flex items-center justify-center border border-stone-100">
                <MessageSquareHeart className="w-5 h-5 text-stone-600" />
              </div>
            </Card>

            {/* Tarjeta 3: Ocultas */}
            <Card variant="default" className="flex items-center justify-between p-6 rounded-3xl bg-white shadow-sm border border-stone-150/75">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Ocultas</span>
                <span className={`font-serif text-4xl font-light ${unmoderatedPhotos.length > 0 ? 'text-amber-600' : 'text-stone-900'}`}>
                  {unmoderatedPhotos.length}
                </span>
              </div>
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${unmoderatedPhotos.length > 0 ? 'bg-amber-50 border-amber-100' : 'bg-stone-50 border-stone-100'}`}>
                <EyeOff className={`w-5 h-5 ${unmoderatedPhotos.length > 0 ? 'text-amber-600' : 'text-stone-600'}`} />
              </div>
            </Card>

            {/* Acceso Rápido */}
            <Card variant="glass" className="sm:col-span-3 p-8 flex flex-col gap-4 rounded-3xl">
              <h3 className="font-serif text-xl italic text-stone-900">Administración Colaborativa</h3>
              <p className="text-sm text-stone-500 leading-relaxed">
                ¡Hola Naomi &amp; Carlos! Su timeline cronológico está en marcha. Todos los invitados pueden subir sus fotos e incluir opcionalmente un dulce mensaje de felicitación. 
              </p>
              <p className="text-xs text-stone-400 -mt-1 leading-relaxed">
                * Pulsen sobre cualquier miniatura en el timeline para abrir el **Lightbox de Detalle**, visualizar los datos EXIF de captura, los mensajes completos del invitado, o eliminar fotos de forma permanente.
              </p>
              <div className="flex flex-wrap gap-3 mt-2">
                <Button onClick={() => setActiveTab('timeline')} variant="primary" size="sm" className="rounded-xl">
                  Ir al Timeline General
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
                <Button onClick={() => setActiveTab('moderation')} variant="secondary" size="sm" className="rounded-xl">
                  Ver Fotos Ocultas ({unmoderatedPhotos.length})
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* ======================================================== */}
        {/* PESTAÑAS: TIMELINE (GENERAL) / MODERACIÓN */}
        {/* ======================================================== */}
        {(activeTab === 'timeline' || activeTab === 'moderation') && !isLoadingData && (
          <div className="flex flex-col gap-6 animate-fade-in">
            
            {/* Header del Feed */}
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-serif text-lg italic text-stone-900">
                  {activeTab === 'moderation' ? 'Fotos Ocultas / Moderación' : 'Timeline Completo'}
                </h3>
                <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider font-mono mt-0.5">
                  {activeTab === 'moderation' 
                    ? `Mostrando ${unmoderatedPhotos.length} fotos ocultadas de la galería` 
                    : `Mostrando las ${photos.length} fotos ordenadas cronológicamente`}
                </p>
              </div>
            </div>

            {/* Caso de Feed vacío */}
            {activeTimelinePhotos.length === 0 ? (
              <Card variant="glass" className="text-center py-16 flex flex-col items-center justify-center gap-3 rounded-3xl border border-white/20">
                <ImageIcon className="w-10 h-10 text-stone-300 stroke-[1.2]" />
                <h3 className="font-serif text-lg text-stone-850">Sin fotos por mostrar</h3>
                <p className="text-xs text-stone-400 max-w-[260px] leading-relaxed">
                  {activeTab === 'moderation' 
                    ? '¡Todo excelente! No tienes fotos ocultas en este momento.' 
                    : 'Las fotos subidas por los invitados se mostrarán cronológicamente aquí.'}
                </p>
              </Card>
            ) : (
              /* Grid de fotos Apple Style (Limpio, sin EXIF flotantes molestos ni botones de borrar) */
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {activeTimelinePhotos.map((photo, index) => {
                  const dateTime = formatPhotoDate(photo.taken_at);
                  return (
                    <Card
                      key={photo.id}
                      variant="default"
                      className="p-0 overflow-hidden rounded-2xl relative group border border-stone-150/75 shadow-sm bg-white"
                    >
                      {/* Foto / Link al Lightbox */}
                      <div 
                        className="aspect-square bg-stone-50 relative overflow-hidden cursor-pointer active:scale-95 transition-transform duration-200"
                        onClick={() => setActiveLightboxIndex(index)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.url}
                          alt="Foto de la boda"
                          className="w-full h-full object-cover"
                        />

                        {/* Indicador de Mensaje de Invitado */}
                        {photo.message && (
                          <div className="absolute top-2 right-2 p-1.5 rounded-full bg-black/45 backdrop-blur-[2px] text-white">
                            <MessageSquareHeart className="w-3 h-3 fill-stone-100/10" />
                          </div>
                        )}

                        {/* Info flotante súper sutil */}
                        <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/70 to-transparent text-white text-[9px] flex flex-col gap-0.5 opacity-90 justify-end h-10">
                          {photo.guest_name && (
                            <span className="font-semibold text-amber-250 truncate">✍ {photo.guest_name}</span>
                          )}
                          <span className="font-mono text-[8px] text-stone-300">{dateTime.time}</span>
                        </div>
                      </div>

                      {/* Control ÚNICO en miniatura: Alternador Visible/Oculta */}
                      <div className="p-2 border-t border-stone-100 flex items-center justify-between bg-stone-50/50">
                        <span className="text-[9px] uppercase tracking-wider font-semibold text-stone-400 font-mono">
                          {photo.approved ? 'Visible' : 'Oculta'}
                        </span>
                        <button
                          onClick={() => handleToggleApprove(photo.id, photo.approved)}
                          disabled={isActionPending !== null}
                          className={`
                            p-1.5 rounded-full transition-all duration-200 active:scale-95
                            ${photo.approved 
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100' 
                              : 'bg-amber-50 text-amber-600 border border-amber-100 hover:bg-amber-100'}
                          `}
                          title={photo.approved ? 'Ocultar foto' : 'Hacer visible'}
                        >
                          {photo.approved ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* ESTADOS DE CARGA */}
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

      {/* ======================================================== */}
      {/* LIGHTBOX ADMINISTRATIVO PREMIUM (CON EXIF Y ELIMINAR) */}
      {/* ======================================================== */}
      {activeLightboxIndex !== null && (
        <div 
          className="fixed inset-0 z-50 bg-black/98 flex flex-col items-center justify-between p-4 animate-fade-in overflow-y-auto select-none"
          onClick={() => setActiveLightboxIndex(null)}
        >
          {/* Barra superior */}
          <div className="w-full max-w-lg flex justify-between items-center text-white py-2 z-10 shrink-0">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-amber-300">
                ✍ {activeTimelinePhotos[activeLightboxIndex].guest_name || 'Invitado de la Boda'}
              </span>
              <span className="text-[9px] text-stone-400 font-mono">
                📅 {formatPhotoDate(activeTimelinePhotos[activeLightboxIndex].taken_at).date} • {formatPhotoDate(activeTimelinePhotos[activeLightboxIndex].taken_at).time}
              </span>
            </div>
            
            <button
              onClick={() => setActiveLightboxIndex(null)}
              className="p-2 rounded-full bg-white/10 text-stone-300 hover:text-white backdrop-blur-sm transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Área de Visualización e Info */}
          <div className="w-full flex-1 flex flex-col items-center justify-center my-2 gap-4 relative py-4">
            
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
              src={activeTimelinePhotos[activeLightboxIndex].url}
              alt="Foto fullscreen administrativa"
              className="max-h-[45vh] max-w-full object-contain rounded-2xl shadow-2xl animate-scale-up border border-white/5"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Botón Derecha */}
            {activeLightboxIndex < activeTimelinePhotos.length - 1 && (
              <button
                onClick={handleNextPhoto}
                className="absolute right-2 p-3 rounded-full bg-white/5 hover:bg-white/10 text-white backdrop-blur-sm transition-colors z-10 active:scale-95"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}

            {/* Tarjeta de Información y Controles (EXIF, Mensajes y botón de Borrado) */}
            <div 
              className="w-full max-w-sm bg-white/10 border border-white/10 rounded-2xl p-4 flex flex-col gap-3 backdrop-blur-md text-white shadow-xl animate-scale-up mx-4 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Mensaje de Felicitación */}
              {activeTimelinePhotos[activeLightboxIndex].message && (
                <div className="flex flex-col gap-1 border-b border-white/10 pb-3">
                  <span className="text-[8px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-1 font-sans">
                    <MessageSquareHeart className="w-3 h-3 text-amber-300" />
                    Mensaje de felicitación
                  </span>
                  <p className="text-xs font-serif italic text-stone-100 leading-relaxed">
                    &ldquo;{activeTimelinePhotos[activeLightboxIndex].message}&rdquo;
                  </p>
                </div>
              )}

              {/* Ficha de Detalles EXIF (Solo mostrada aquí) */}
              <div className="flex flex-col gap-1 text-[9px] font-mono text-stone-300">
                <span className="text-[8px] font-bold text-stone-400 uppercase tracking-widest mb-0.5 flex items-center gap-1 font-sans">
                  <Camera className="w-3 h-3 text-stone-400" />
                  Datos técnicos de captura
                </span>
                
                {activeTimelinePhotos[activeLightboxIndex].metadata?.camera_model ? (
                  <>
                    <div className="truncate">📷 Cámara: {activeTimelinePhotos[activeLightboxIndex].metadata.camera_make} {activeTimelinePhotos[activeLightboxIndex].metadata.camera_model}</div>
                    {activeTimelinePhotos[activeLightboxIndex].metadata.width && (
                      <div>📐 Dimensiones: {activeTimelinePhotos[activeLightboxIndex].metadata.width}x{activeTimelinePhotos[activeLightboxIndex].metadata.height}px</div>
                    )}
                  </>
                ) : (
                  <div className="italic text-stone-400">Sin metadatos EXIF disponibles (se usó la fecha del archivo).</div>
                )}
              </div>

              {/* Botón de Borrado Únicamente Integrado en Lightbox */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPhotoToDelete(activeTimelinePhotos[activeLightboxIndex].id)}
                className="w-full mt-1 py-2.5 rounded-xl border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-300 hover:text-red-200 text-xs font-bold flex items-center justify-center gap-1.5"
                disabled={isActionPending !== null}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar esta Foto
              </Button>
            </div>

          </div>

          {/* Barra inferior */}
          <div className="w-full max-w-xs text-center text-stone-500 text-[10px] uppercase tracking-widest pb-2 shrink-0 font-mono">
            Foto {activeLightboxIndex + 1} de {activeTimelinePhotos.length}
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Borrado Permanente */}
      {photoToDelete && (
        <div className="fixed inset-0 z-[105] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <Card variant="glass" className="max-w-xs w-full text-center p-6 flex flex-col gap-4 animate-scale-up border border-white/10">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-650 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg text-stone-950">¿Eliminar Foto?</h3>
              <p className="text-xs text-stone-500 mt-2 leading-relaxed">
                Esta acción es completamente permanente. Borrará la foto de tu base de datos y de tu almacenamiento físico en Supabase Storage.
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

    </main>
  );
}
