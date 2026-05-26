'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { 
  Camera, 
  Upload, 
  X, 
  FolderHeart, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  ArrowLeft,
  Eye
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { extractPhotoMetadata, PhotoMetadata } from '@/lib/exif';

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
  const [albumName, setAlbumName] = useState('');
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
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
          .from('albums')
          .select('id')
          .limit(1);

        if (error) {
          console.error('Error de conexión a Supabase:', error);
          // PGRST116 es "no rows found", lo cual es correcto (significa que la tabla existe pero está vacía)
          if (error.code === 'PGRST116') {
            setConnectionStatus('connected');
          } else if (error.message.includes('relation "public.albums" does not exist') || error.message.includes('relation "albums" does not exist')) {
            setConnectionStatus('error');
            setConnectionError('La tabla "albums" no existe en tu base de datos. ¿Olvidaste ejecutar el script SQL schema.sql en Supabase?');
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

  // Manejo de drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  };

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

      // Creamos la estructura inicial
      const selectedFile: SelectedFile = {
        id,
        file,
        previewUrl,
        status: 'idle',
        progress: 0,
      };

      newFiles.push(selectedFile);
    }

    setFiles(prev => [...prev, ...newFiles]);

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
      return prev.filter(f => f.id !== id);
    });
  };

  // Enviar y subir fotos
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!albumName.trim()) {
      setErrorMsg('Por favor escribe tu nombre o familia para identificar tus fotos (Ej. Fam. Beltrán González).');
      return;
    }

    if (files.length === 0) {
      setErrorMsg('Por favor selecciona al menos una foto para subir.');
      return;
    }

    setErrorMsg(null);
    setIsUploading(true);

    try {
      // 1. Obtener o Crear Álbum
      const cleanAlbumName = albumName.trim();
      const slug = cleanAlbumName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
        .replace(/[^a-z0-9]+/g, '-') // Cambiar no-alfanumericos por guion
        .replace(/(^-|-$)+/g, ''); // Quitar guiones iniciales o finales

      let albumId = '';

      if (!isDemoMode) {
        // Consultar si existe
        const { data: existingAlbum, error: getError } = await supabase
          .from('albums')
          .select('id')
          .eq('name', cleanAlbumName)
          .maybeSingle();

        if (getError) throw getError;

        if (existingAlbum) {
          albumId = existingAlbum.id;
        } else {
          // Crear nuevo
          const { data: newAlbum, error: insertError } = await supabase
            .from('albums')
            .insert({ name: cleanAlbumName, slug })
            .select('id')
            .single();

          if (insertError) throw insertError;
          albumId = newAlbum.id;
        }
      } else {
        albumId = 'demo-album-uuid';
      }

      // 2. Subir Fotos secuencialmente o en paralelo
      const uploadPromises = files.map(async (item) => {
        // Actualizar estado de subida
        setFiles(prev => 
          prev.map(f => f.id === item.id ? { ...f, status: 'uploading', progress: 10 } : f)
        );

        try {
          const extension = item.file.name.split('.').pop() || 'jpg';
          const fileName = `${albumId}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${extension}`;
          
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

            // C. Guardar metadatos en Base de Datos
            const takenAt = item.metadata?.takenAt || new Date();
            const { error: dbError } = await supabase
              .from('photos')
              .insert({
                album_id: albumId,
                storage_path: fileName,
                url: publicUrl,
                taken_at: takenAt.toISOString(),
                approved: true, // Aprobadas por defecto
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
              await new Promise(resolve => setTimeout(resolve, 250));
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

      // Si todo sale bien
      setUploadSuccess(true);
      setFiles([]);
      setAlbumName('');
    } catch (err: unknown) {
      console.error('Error general durante la subida:', err);
      setErrorMsg('Ocurrió un error al procesar las imágenes. Asegúrate de configurar las variables de entorno.');
    } finally {
      setIsUploading(false);
    }
  };

  // Reiniciar flujo después de éxito
  const resetUpload = () => {
    setUploadSuccess(false);
    setErrorMsg(null);
  };

  return (
    <main className="min-h-screen py-8 px-4 flex flex-col items-center justify-start bg-[#fcfbfa]">
      {/* Contenedor central - Mobile first */}
      <div className="w-full max-w-md flex flex-col gap-6">
        
        {/* Botón de regreso a Home */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-700 transition-colors duration-200 self-start ml-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al inicio</span>
        </Link>
        
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

        {/* Indicadores Dinámicos de Conexión a Supabase */}
        {connectionStatus === 'checking' && (
          <Card variant="glass" className="border-stone-200 bg-stone-50/50 p-4 animate-pulse">
            <div className="flex gap-3 items-center">
              <Loader2 className="w-4 h-4 text-stone-600 animate-spin shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Verificando Conexión...
                </h4>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Comprobando tu conexión con la base de datos de Supabase.
                </p>
              </div>
            </div>
          </Card>
        )}

        {connectionStatus === 'connected' && (
          <Card variant="glass" className="border-emerald-200 bg-emerald-50/60 p-4">
            <div className="flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  Conexión Exitosa con Supabase
                </h4>
                <p className="text-[11px] text-emerald-700 mt-1 leading-relaxed">
                  Tu base de datos y almacenamiento están listos. Las imágenes subidas se guardarán directamente en tu proyecto real de Supabase.
                </p>
              </div>
            </div>
          </Card>
        )}

        {connectionStatus === 'error' && (
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

        {connectionStatus === 'demo' && (
          <Card variant="glass" className="border-amber-200 bg-amber-50/70 p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                  Modo Demostración Activo
                </h4>
                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                  Las credenciales de Supabase no están configuradas en `.env.local`. Puedes interactuar con la interfaz y ver la simulación de subida y lectura de EXIF.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Notificación de Éxito */}
        {uploadSuccess ? (
          <Card variant="glass" className="text-center py-10 px-6 flex flex-col items-center gap-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <div>
              <h2 className="font-serif text-2xl text-stone-950">¡Recuerdos Guardados!</h2>
              <p className="text-sm text-stone-500 mt-2 leading-relaxed">
                Tus fotos se han subido con éxito al álbum. ¡Muchas gracias por capturar y compartir estos momentos tan especiales!
              </p>
            </div>
            
            <div className="w-full flex flex-col gap-3 mt-4">
              <Button variant="primary" onClick={resetUpload} className="w-full py-4 text-sm font-semibold rounded-2xl">
                Subir más fotos
              </Button>
              
              <Link href="/gallery" className="w-full">
                <Button variant="secondary" className="w-full py-4 text-sm font-semibold rounded-2xl flex items-center justify-center gap-2">
                  <Eye className="w-4 h-4 text-stone-700" />
                  Ver todas las fotos (Galería)
                </Button>
              </Link>

              <Link href="/" className="w-full">
                <Button variant="outline" className="w-full py-4 text-sm font-semibold rounded-2xl">
                  Volver al Inicio
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          /* Formulario Principal de Carga */
          <form onSubmit={handleUpload} className="flex flex-col gap-5">
            
            <Card variant="default" className="flex flex-col gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-stone-50 flex items-center justify-center border border-stone-100">
                  <FolderHeart className="w-4 h-4 text-stone-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-stone-850">Escribe tu Nombre o Familia</h3>
                  <p className="text-[11px] text-stone-400">Es obligatorio escribir algo aquí para crear tu carpeta interactiva</p>
                </div>
              </div>
              <Input
                label="Escribe tu Nombre, Familia o Mesa aquí (Obligatorio)"
                placeholder="Ej. Fam. Beltrán González"
                value={albumName}
                onChange={(e) => setAlbumName(e.target.value)}
                disabled={isUploading}
                required
              />
            </Card>

            {/* Selector de Imágenes (Dropzone / Input) */}
            <Card
              variant="default"
              className={`p-0 overflow-hidden border-dashed border-2 transition-all duration-300 rounded-3xl ${
                isDragging 
                  ? 'border-stone-400 bg-stone-50' 
                  : files.length > 0 
                    ? 'border-stone-100' 
                    : 'border-stone-200 hover:border-stone-300'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {/* Dropzone interactivo */}
              <div 
                className="p-8 flex flex-col items-center justify-center text-center cursor-pointer"
                onClick={() => !isUploading && fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
                
                <div className="w-14 h-14 rounded-2xl bg-stone-50 flex items-center justify-center mb-4 border border-stone-100 group-hover:scale-105 transition-transform duration-200">
                  <Upload className="w-5 h-5 text-stone-500" />
                </div>
                
                <p className="text-sm font-medium text-stone-800">
                  Seleccionar fotos de la galería
                </p>
                <p className="text-xs text-stone-400 mt-1">
                  o arrastra y suelta imágenes aquí
                </p>
              </div>

              {/* Lista de Previsualización */}
              {files.length > 0 && (
                <div className="bg-stone-50/50 border-t border-stone-100 p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                      Seleccionadas ({files.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setFiles([])}
                      disabled={isUploading}
                      className="text-[11px] font-semibold text-stone-500 hover:text-stone-850 disabled:opacity-50"
                    >
                      Limpiar todo
                    </button>
                  </div>

                  {/* Grid de Previews */}
                  <div className="grid grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-1">
                    {files.map((item) => (
                      <div 
                        key={item.id} 
                        className="relative aspect-square rounded-2xl overflow-hidden border border-stone-200 bg-white group"
                      >
                        {/* Imagen de Preview */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.previewUrl}
                          alt="preview"
                          className="w-full h-full object-cover"
                        />

                        {/* Capa de carga o estado */}
                        {item.status === 'uploading' && (
                          <div className="absolute inset-0 bg-black/45 flex flex-col items-center justify-center text-white">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-[9px] mt-1 font-medium">{item.progress}%</span>
                          </div>
                        )}
                        
                        {item.status === 'success' && (
                          <div className="absolute inset-0 bg-emerald-500/70 flex items-center justify-center text-white">
                            <CheckCircle2 className="w-6 h-6" />
                          </div>
                        )}

                        {item.status === 'error' && (
                          <div className="absolute inset-0 bg-red-500/70 flex items-center justify-center text-white p-1 text-center">
                            <AlertCircle className="w-6 h-6" />
                          </div>
                        )}

                        {/* Botón para remover antes de subir */}
                        {item.status === 'idle' && !isUploading && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(item.id);
                            }}
                            className="absolute top-1 right-1 p-1 bg-black/40 hover:bg-black/60 rounded-full text-white backdrop-blur-sm transition-colors duration-150"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Badge de EXIF cargado */}
                        {item.metadata?.takenAt && item.status === 'idle' && (
                          <div className="absolute bottom-1 left-1 right-1 bg-black/35 backdrop-blur-[2px] text-[8px] text-white px-1.5 py-0.5 rounded-md truncate font-mono">
                            📅 {item.metadata.takenAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Mensajes de Error */}
            {errorMsg && (
              <div className="flex gap-2 p-3 rounded-2xl bg-red-50 border border-red-100 text-red-650 text-xs items-center leading-relaxed">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Botón de Enviar */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full py-4 text-sm font-semibold rounded-2xl"
              isLoading={isUploading}
            >
              {isUploading ? 'Subiendo fotos...' : `Subir ${files.length} foto${files.length !== 1 ? 's' : ''}`}
            </Button>
          </form>
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
