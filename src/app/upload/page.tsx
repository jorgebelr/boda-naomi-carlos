'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { 
  Camera, 
  Upload, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  ArrowLeft,
  Eye,
  MessageSquareHeart,
  User,
  Sparkles
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { extractPhotoMetadata, PhotoMetadata } from '@/lib/exif';
import { getSharedFiles } from '@/lib/upload-store';

// Estructura de archivo seleccionado
interface SelectedFile {
  id: string;
  file: File;
  previewUrl: string;
  metadata?: PhotoMetadata;
  status: 'idle' | 'uploading' | 'success' | 'error';
  progress: number;
  errorMsg?: string;
}

export default function UploadPage() {
  const [step, setStep] = useState<'select' | 'review' | 'success'>('select');
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [guestName, setGuestName] = useState('');
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Detectar si Supabase está configurado correctamente
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'unchecked' | 'checking' | 'connected' | 'error' | 'demo'>('unchecked');
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Comprobar si las variables de entorno están configuradas
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key || url.includes('your-project-id')) {
      setIsDemoMode(true);
      setConnectionStatus('demo');
      return;
    }

    setIsDemoMode(false);
    setConnectionStatus('checking');

    const checkConnection = async () => {
      try {
        const { error } = await supabase
          .from('photos')
          .select('id')
          .limit(1);

        if (error) {
          console.error('Error de conexión a Supabase:', error);
          if (error.code === 'PGRST116') {
            setConnectionStatus('connected');
          } else if (error.message.includes('relation "public.photos" does not exist') || error.message.includes('relation "photos" does not exist')) {
            setConnectionStatus('error');
            setConnectionError('La tabla "photos" no existe en tu base de datos. ¿Olvidaste ejecutar el nuevo script SQL schema.sql en la consola de Supabase?');
          } else {
            setConnectionStatus('error');
            setConnectionError(`Error (${error.code}): ${error.message}`);
          }
        } else {
          setConnectionStatus('connected');
        }
      } catch (err: unknown) {
        console.error('Error inesperado de conexión:', err);
        setConnectionStatus('error');
        setConnectionError(err instanceof Error ? err.message : 'Error de red o CORS.');
      }
    };

    checkConnection();
  }, []);

  // Cargar archivos compartidos desde el inicio si existen
  useEffect(() => {
    const shared = getSharedFiles();
    if (shared && shared.length > 0) {
      const dt = new DataTransfer();
      shared.forEach(file => dt.items.add(file));
      processFiles(dt.files);
    }
  }, []);

  // Manejar selección de archivos
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(e.target.files);
    }
  };

  // Procesar archivos, generar previews y extraer EXIF
  const processFiles = async (fileList: FileList) => {
    const newFiles: SelectedFile[] = [];
    
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      
      // Validar tipo (sólo imágenes)
      if (!file.type.startsWith('image/')) {
        continue;
      }

      const id = `${file.name}-${Date.now()}-${i}`;
      const previewUrl = URL.createObjectURL(file);

      const selectedFile: SelectedFile = {
        id,
        file,
        previewUrl,
        status: 'idle',
        progress: 0,
      };

      newFiles.push(selectedFile);
    }

    if (newFiles.length === 0) return;

    setFiles(prev => [...prev, ...newFiles]);
    setStep('review'); // Pasar inmediatamente al paso de revisión y mensaje!

    // Extraer metadatos EXIF de forma asíncrona para no congelar la UI
    for (const selectedFile of newFiles) {
      extractPhotoMetadata(selectedFile.file).then(metadata => {
        setFiles(prev => 
          prev.map(f => f.id === selectedFile.id ? { ...f, metadata } : f)
        );
      });
    }
  };

  // Remover foto individual
  const removeFile = (id: string) => {
    setFiles(prev => {
      const target = prev.find(f => f.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      const updated = prev.filter(f => f.id !== id);
      // Si el usuario borra todas las fotos de la selección, lo regresamos al selector
      if (updated.length === 0) {
        setStep('select');
      }
      return updated;
    });
  };

  // Enviar y subir fotos
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (files.length === 0) {
      setErrorMsg('Por favor selecciona al menos una foto para subir.');
      return;
    }

    setErrorMsg(null);
    setIsUploading(true);

    try {
      // Subir Fotos secuencialmente o en paralelo
      const uploadPromises = files.map(async (item) => {
        setFiles(prev => 
          prev.map(f => f.id === item.id ? { ...f, status: 'uploading', progress: 10 } : f)
        );

        try {
          const extension = item.file.name.split('.').pop() || 'jpg';
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${extension}`;
          
          let publicUrl = '';
          
          if (!isDemoMode) {
            // A. Subir a Supabase Storage
            const { error: storageError } = await supabase.storage
              .from('wedding-photos')
              .upload(fileName, item.file, {
                cacheControl: '3600',
                upsert: false
              });

            if (storageError) throw storageError;

            // Actualizar progreso
            setFiles(prev => 
              prev.map(f => f.id === item.id ? { ...f, progress: 60 } : f)
            );

            // B. Obtener URL pública
            const { data } = supabase.storage
              .from('wedding-photos')
              .getPublicUrl(fileName);

            publicUrl = data.publicUrl;

            // C. Formatear la fecha EXIF de captura en cadena ISO local sin offset
            // Esto evita que las zonas horarias de los dispositivos alteren el orden cronológico real
            const takenAt = item.metadata?.takenAt || new Date();
            const year = takenAt.getFullYear();
            const month = String(takenAt.getMonth() + 1).padStart(2, '0');
            const day = String(takenAt.getDate()).padStart(2, '0');
            const hours = String(takenAt.getHours()).padStart(2, '0');
            const minutes = String(takenAt.getMinutes()).padStart(2, '0');
            const seconds = String(takenAt.getSeconds()).padStart(2, '0');
            const localIsoString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;

            // D. Guardar en Base de Datos (con mensaje y autor opcionales)
            const { error: dbError } = await supabase
              .from('photos')
              .insert({
                storage_path: fileName,
                url: publicUrl,
                taken_at: localIsoString,
                approved: true, // Aprobadas por defecto
                guest_name: guestName.trim() || null,
                message: message.trim() || null,
                metadata: {
                  camera_make: item.metadata?.cameraMake || null,
                  camera_model: item.metadata?.cameraModel || null,
                  width: item.metadata?.width || null,
                  height: item.metadata?.height || null,
                  orientation: item.metadata?.orientation || null,
                  gps: (item.metadata?.latitude && item.metadata?.longitude) 
                    ? { lat: item.metadata.latitude, lng: item.metadata.longitude } 
                    : null,
                  ...item.metadata?.additional
                }
              });

            if (dbError) throw dbError;

          } else {
            // Modo Demo: Simulación estética de subida
            for (let p = 20; p <= 100; p += 20) {
              await new Promise(resolve => setTimeout(resolve, 200));
              setFiles(prev => 
                prev.map(f => f.id === item.id ? { ...f, progress: p } : f)
              );
            }
          }

          // Completado con éxito
          setFiles(prev => 
            prev.map(f => f.id === item.id ? { ...f, status: 'success', progress: 100 } : f)
          );
        } catch (err: unknown) {
          const error = err as Error;
          console.error(`Error subiendo la foto ${item.file.name}:`, error);
          setFiles(prev => 
            prev.map(f => f.id === item.id ? { ...f, status: 'error', errorMsg: error.message || 'Error en subida' } : f)
          );
          throw error;
        }
      });

      // Esperar a que se completen todas las subidas
      await Promise.all(uploadPromises);

      // Si todo sale bien, pasar al paso de éxito
      setStep('success');
    } catch (err: unknown) {
      console.error('Error general durante la subida:', err);
      setErrorMsg('Ocurrió un error al procesar las imágenes. Asegúrate de que las tablas en Supabase estén correctas.');
    } finally {
      setIsUploading(false);
    }
  };

  // Reiniciar flujo después de éxito
  const resetUpload = () => {
    setFiles([]);
    setMessage('');
    setGuestName('');
    setErrorMsg(null);
    setStep('select');
  };

  return (
    <main className="min-h-screen py-8 px-4 flex flex-col items-center justify-start bg-[#fcfbfa]">
      {/* Contenedor central - Mobile first */}
      <div className="w-full max-w-md flex flex-col gap-6">
        
        {/* Botón de regreso a Home (oculto en el paso de éxito) */}
        {step !== 'success' && (
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-700 transition-colors duration-200 self-start ml-2">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver al inicio</span>
          </Link>
        )}
        
        {/* Encabezado elegante de Bodas */}
        <header className="text-center py-4 flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mb-3">
            <Camera className="w-6 h-6 text-stone-700 stroke-[1.5]" />
          </div>
          <h1 className="font-serif text-3xl italic text-stone-900 tracking-tight">
            Nuestra Boda
          </h1>
          <p className="text-xs font-sans text-stone-400 tracking-widest uppercase mt-2">
            Álbum Colaborativo Privado
          </p>
        </header>

        {/* Indicadores Dinámicos de Conexión a Supabase (Solo en select/review) */}
        {step !== 'success' && connectionStatus === 'checking' && (
          <Card variant="glass" className="border-stone-200 bg-stone-50/50 p-4 animate-pulse">
            <div className="flex gap-3 items-center">
              <Loader2 className="w-4 h-4 text-stone-600 animate-spin shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Verificando Conexión...
                </h4>
              </div>
            </div>
          </Card>
        )}

        {step !== 'success' && connectionStatus === 'error' && (
          <Card variant="glass" className="border-red-200 bg-red-50/70 p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-red-800 uppercase tracking-wider">
                  Error de Conexión a Supabase
                </h4>
                <p className="text-xs text-red-700 mt-1 leading-relaxed">
                  {connectionError}
                </p>
              </div>
            </div>
          </Card>
        )}

        {step !== 'success' && connectionStatus === 'demo' && (
          <Card variant="glass" className="border-amber-200 bg-amber-50/70 p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                  Modo Demostración Activo
                </h4>
                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                  Las credenciales no están configuradas. Verás simulaciones estéticas de subida.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* ======================================================== */}
        {/* PASO 1: SELECCIONAR IMÁGENES (Paso Inicial) */}
        {/* ======================================================== */}
        {step === 'select' && (
          <div className="flex flex-col gap-5 animate-fade-in">
            <Card variant="default" className="text-center p-8 flex flex-col items-center justify-center border-dashed border-2 border-stone-250 rounded-[2.5rem] bg-white">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                multiple
                accept="image/*"
                onChange={handleFileChange}
              />
              
              <div className="w-16 h-16 rounded-[1.8rem] bg-stone-50 border border-stone-100 flex items-center justify-center mb-6">
                <Upload className="w-6 h-6 text-stone-600" />
              </div>
              
              <h2 className="font-serif text-xl italic text-stone-900">¡Comparte tus momentos!</h2>
              <p className="text-xs text-stone-500 leading-relaxed max-w-[260px] mt-2 mb-6">
                Selecciona las fotos de la boda directamente desde tu galería o captura nuevas en el instante.
              </p>

              <Button
                type="button"
                variant="primary"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 text-sm font-semibold rounded-2xl flex items-center justify-center gap-2 shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300/10" />
                Subir fotos de la galería
              </Button>
            </Card>
          </div>
        )}

        {/* ======================================================== */}
        {/* PASO 2: REVISIÓN DE FOTOS Y REDACCIÓN DE MENSAJE */}
        {/* ======================================================== */}
        {step === 'review' && (
          <form onSubmit={handleUpload} className="flex flex-col gap-5 animate-fade-in">
            
            {/* Contenedor de Vista Previa */}
            <Card variant="default" className="flex flex-col gap-4 p-5 rounded-3xl">
              <div className="flex justify-between items-center pb-2 border-b border-stone-100">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
                  Fotos seleccionadas ({files.length})
                </span>
                <button
                  type="button"
                  onClick={() => { setFiles([]); setStep('select'); }}
                  disabled={isUploading}
                  className="text-[11px] font-semibold text-stone-500 hover:text-stone-900 disabled:opacity-50"
                >
                  Limpiar todo
                </button>
              </div>

              {/* Grid de miniaturas */}
              <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-1">
                {files.map((item) => (
                  <div 
                    key={item.id} 
                    className="relative aspect-square rounded-xl overflow-hidden border border-stone-200 bg-white"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.previewUrl}
                      alt="preview"
                      className="w-full h-full object-cover"
                    />

                    {/* Capas de Carga individual */}
                    {item.status === 'uploading' && (
                      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span className="text-[8px] mt-0.5">{item.progress}%</span>
                      </div>
                    )}

                    {/* Remover foto antes de subir */}
                    {item.status === 'idle' && !isUploading && (
                      <button
                        type="button"
                        onClick={() => removeFile(item.id)}
                        className="absolute top-0.5 right-0.5 p-1 bg-black/40 hover:bg-black/60 rounded-full text-white backdrop-blur-sm transition-colors"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}

                    {/* Badge de EXIF extraído con éxito */}
                    {item.metadata?.takenAt && item.status === 'idle' && (
                      <div className="absolute bottom-0.5 left-0.5 right-0.5 bg-black/35 backdrop-blur-[1px] text-[7px] text-white px-1 py-0.5 rounded-md truncate font-mono text-center">
                        📅 {item.metadata.takenAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Caja de Mensaje a los Novios */}
            <Card variant="default" className="flex flex-col gap-4 p-5 rounded-3xl">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-full bg-stone-50 flex items-center justify-center border border-stone-100 shrink-0 mt-0.5">
                  <MessageSquareHeart className="w-4 h-4 text-stone-600 fill-stone-500/5" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <h3 className="text-sm font-semibold text-stone-850">Deja un lindo mensaje a los novios</h3>
                  <p className="text-[11px] text-stone-400">Este mensaje aparecerá como nota en todas estas fotos (Opcional)</p>
                </div>
              </div>
              
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={isUploading}
                placeholder="¡Muchas felicidades Naomi & Carlos! Les deseamos un matrimonio hermoso lleno de amor y complicidad..."
                className="w-full min-h-[90px] p-3 text-sm bg-white border border-stone-200 rounded-2xl text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-450 focus:ring-2 focus:ring-stone-100 transition-all duration-200 resize-none disabled:bg-stone-50 disabled:text-stone-400"
                maxLength={300}
              />
              <div className="text-right text-[10px] text-stone-400 font-mono -mt-2">
                {message.length}/300
              </div>
            </Card>

            {/* Caja de Firma (Autor) */}
            <Card variant="default" className="flex flex-col gap-4 p-5 rounded-3xl">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-stone-50 flex items-center justify-center border border-stone-100 shrink-0">
                  <User className="w-4 h-4 text-stone-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-stone-850">¿Quién firma?</h3>
                  <p className="text-[11px] text-stone-400">Tu nombre o apellidos de familia (Opcional)</p>
                </div>
              </div>
              
              <Input
                placeholder="Ej. Fam. Beltrán González"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                disabled={isUploading}
              />
            </Card>

            {/* Mensajes de Error */}
            {errorMsg && (
              <div className="flex gap-2 p-3 rounded-2xl bg-red-50 border border-red-100 text-red-650 text-xs items-center leading-relaxed">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Botón de Carga Principal */}
            <div className="flex flex-col gap-3 mt-1">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full py-4 text-sm font-semibold rounded-2xl shadow-sm"
                isLoading={isUploading}
              >
                {isUploading ? 'Subiendo fotos...' : `Subir ${files.length} foto${files.length !== 1 ? 's' : ''}`}
              </Button>

              <button
                type="button"
                onClick={() => !isUploading && fileInputRef.current?.click()}
                disabled={isUploading}
                className="text-xs text-stone-500 hover:text-stone-900 transition-colors font-semibold py-1.5 self-center hover:underline disabled:opacity-50"
              >
                Añadir más fotos / Cambiar selección
              </button>
            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* PASO 3: TARJETA DE ÉXITO FINAL */}
        {/* ======================================================== */}
        {step === 'success' && (
          <Card variant="glass" className="text-center py-10 px-6 flex flex-col items-center gap-5 animate-fade-in rounded-3xl border border-white/20">
            <div className="w-16 h-16 rounded-[1.8rem] bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            
            <div>
              <h2 className="font-serif text-2xl italic text-stone-950">¡Recuerdos Guardados!</h2>
              <p className="text-sm text-stone-500 mt-2 leading-relaxed">
                Tus momentos compartidos y tu mensaje de cariño ya están publicados en el álbum de la boda. ¡Muchas gracias por capturar y atesorar este día!
              </p>
            </div>

            {/* Nota de mensaje dejado */}
            {(message.trim() || guestName.trim()) && (
              <div className="w-full bg-[#fdfdfc] border border-stone-150 rounded-2xl p-4 text-left flex flex-col gap-1.5 shadow-sm max-w-[320px]">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1">
                  <MessageSquareHeart className="w-3 h-3 text-stone-450 fill-stone-500/5" />
                  Tu dedicatoria:
                </span>
                {message.trim() && (
                  <p className="text-xs italic text-stone-600 leading-relaxed font-serif">&ldquo;{message.trim()}&rdquo;</p>
                )}
                {guestName.trim() && (
                  <span className="text-[10px] text-stone-500 font-semibold self-end font-mono">— {guestName.trim()}</span>
                )}
              </div>
            )}
            
            <div className="w-full flex flex-col gap-3 mt-4">
              <Link href="/gallery" className="w-full">
                <Button variant="primary" className="w-full py-4 text-sm font-semibold rounded-2xl flex items-center justify-center gap-2 shadow-sm">
                  <Eye className="w-4 h-4 text-amber-300" />
                  Ver galería de fotos
                </Button>
              </Link>

              <Button variant="secondary" onClick={resetUpload} className="w-full py-4 text-sm font-semibold rounded-2xl">
                Compartir más fotos
              </Button>
              
              <Link href="/" className="w-full">
                <Button variant="outline" className="w-full py-4 text-sm font-semibold rounded-2xl">
                  Volver al Inicio
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {/* Footer minimalista */}
        <footer className="text-center py-6 mt-4">
          <p className="text-[10px] text-stone-400 uppercase tracking-widest leading-relaxed">
            Álbum Privado • Hecho con Amor
          </p>
        </footer>
      </div>
    </main>
  );
}
