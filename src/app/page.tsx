'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Camera, Heart, Sparkles, Lock, Eye, X, Image as ImageIcon, Check, FolderHeart, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { setSharedFiles } from '@/lib/upload-store';
import { getWeddingSettings, THEMES, WeddingTheme, WeddingSettings } from '@/lib/settings';

export default function Home() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  
  // Estado para controlar el tutorial interactivo
  const [activeTutorialStep, setActiveTutorialStep] = useState<number | null>(null);

  // Estados de configuración de boda
  const [settings, setSettings] = useState<WeddingSettings | null>(null);
  const [activeTheme, setActiveTheme] = useState<WeddingTheme>('stone');

  useEffect(() => {
    getWeddingSettings().then(data => {
      setSettings(data);
      if (data && data.theme_color) {
        setActiveTheme(data.theme_color);
      }
    });
  }, []);

  const theme = THEMES[activeTheme];

  const themeVariables = {
    '--theme-primary': activeTheme === 'rose' ? '#be123c' : activeTheme === 'emerald' ? '#065f46' : activeTheme === 'amber' ? '#d97706' : '#1c1917',
    '--theme-primary-hover': activeTheme === 'rose' ? '#9f1239' : activeTheme === 'emerald' ? '#046a38' : activeTheme === 'amber' ? '#b45309' : '#292524',
  } as React.CSSProperties;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      setSharedFiles(selectedFiles);
      router.push('/upload');
    }
  };

  return (
    <main 
      style={themeVariables}
      className={`min-h-screen py-10 px-4 flex flex-col items-center justify-center transition-colors duration-500 ${theme.bgClass}`}
    >
      <div className="w-full max-w-md flex flex-col gap-8 animate-fade-in">
        
        {/* Tarjeta de Bienvenida Principal */}
        <Card variant="glass" className="text-center py-12 px-6 flex flex-col items-center gap-6 relative overflow-hidden">
          
          {/* Adorno de fondo estilo brillo (Ocultar si hay foto de portada para mejor visibilidad) */}
          {!settings?.cover_photo_url && (
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-stone-100/50 rounded-full blur-3xl pointer-events-none" />
          )}

          {/* Foto de Portada de la Boda (Hero Banner inside Card) */}
          {settings?.cover_photo_url && (
            <div className="relative w-full h-44 -mt-12 -mx-6 mb-2 overflow-hidden bg-stone-150 shrink-0 border-b border-stone-200/50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={settings.cover_photo_url} 
                alt="Alicia y Fernando" 
                className="w-full h-full object-cover animate-fade-in"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#fcfbfa]/15 via-transparent to-black/10" />
            </div>
          )}
          
          {/* Iconos de Amor y Cámara / Foto de Perfil */}
          <div className={`relative ${settings?.cover_photo_url ? '-mt-16 z-10' : ''}`}>
            <div className="w-20 h-20 rounded-full bg-white overflow-hidden border border-stone-150 shadow-[0_4px_20px_rgba(0,0,0,0.06)] shrink-0 flex items-center justify-center">
              {settings?.profile_photo_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img 
                  src={settings.profile_photo_url} 
                  alt="Alicia y Fernando" 
                  className="w-full h-full object-cover animate-fade-in"
                />
              ) : (
                <Camera className="w-8 h-8 text-stone-700 stroke-[1.2]" />
              )}
            </div>
            <div className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full ${theme.accentBg} border ${theme.accentBorder} flex items-center justify-center shadow-sm`}>
              <Heart className={`w-3.5 h-3.5 ${theme.heartColor} ${theme.heartFill}`} />
            </div>
          </div>

          {/* Textos de Bienvenida */}
          <div className="flex flex-col gap-2.5 w-full">
            <span className="text-[10px] font-sans font-bold tracking-widest text-stone-400 uppercase">
              Bienvenidos a Nuestra Boda
            </span>
            <h1 className="font-serif text-4xl text-stone-900 italic tracking-tight font-light leading-snug">
              Alicia y Fernando
            </h1>
            <div className="h-[1px] w-12 bg-stone-200 mx-auto my-1" />
            <p className="text-sm text-stone-500 font-serif italic">
              &ldquo;El amor se compone de una sola alma que habita en dos cuerpos.&rdquo;
            </p>
          </div>

          <p className="text-xs text-stone-500 leading-relaxed font-sans max-w-[280px]">
            ¡Queremos recordar cada instante! Escanea el QR o pulsa el botón para compartir tus fotos o revivir los recuerdos de este gran día.
          </p>

          {/* Botones principales */}
          <div className="w-full flex flex-col gap-3 mt-2">
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            <Button 
              variant="primary" 
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 text-sm font-semibold rounded-2xl flex items-center justify-center gap-2 shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-white/95" />
              Subir mis fotos
            </Button>

            <Button 
              variant="outline" 
              onClick={() => setShowRoleModal(true)}
              className="w-full py-4 text-sm font-semibold rounded-2xl flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4 text-stone-600" />
              Ver fotos compartidas
            </Button>

          </div>
        </Card>

        {/* Sección interactiva: ¿Cómo funciona? */}
        <div className="flex flex-col gap-3.5 px-2">
          <div className="flex items-center justify-center gap-1.5">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest text-center">
              ¿Cómo funciona?
            </h3>
            <span className={`text-[10px] ${theme.accentBadge} px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5`}>
              <Info className="w-2.5 h-2.5" />
              Toca un paso
            </span>
          </div>
          
          <div className="grid grid-cols-3 gap-3 text-center mt-1">
            {/* Paso 1 */}
            <button
              onClick={() => setActiveTutorialStep(1)}
              className="flex flex-col items-center p-3 bg-white hover:bg-stone-50 active:scale-95 transition-all duration-200 rounded-2xl border border-stone-100 shadow-[0_4px_12px_rgba(0,0,0,0.01)] text-center cursor-pointer"
            >
              <span className="text-xs font-bold text-stone-700 bg-stone-100 w-5 h-5 rounded-full flex items-center justify-center mb-2 font-mono">1</span>
              <span className="text-[10px] text-stone-700 font-semibold leading-tight">Elige las Fotos</span>
            </button>

            {/* Paso 2 */}
            <button
              onClick={() => setActiveTutorialStep(2)}
              className="flex flex-col items-center p-3 bg-white hover:bg-stone-50 active:scale-95 transition-all duration-200 rounded-2xl border border-stone-100 shadow-[0_4px_12px_rgba(0,0,0,0.01)] text-center cursor-pointer"
            >
              <span className="text-xs font-bold text-stone-700 bg-stone-100 w-5 h-5 rounded-full flex items-center justify-center mb-2 font-mono">2</span>
              <span className="text-[10px] text-stone-700 font-semibold leading-tight">Escribe tu Grupo</span>
            </button>

            {/* Paso 3 */}
            <button
              onClick={() => setActiveTutorialStep(3)}
              className="flex flex-col items-center p-3 bg-white hover:bg-stone-50 active:scale-95 transition-all duration-200 rounded-2xl border border-stone-100 shadow-[0_4px_12px_rgba(0,0,0,0.01)] text-center cursor-pointer"
            >
              <span className="text-xs font-bold text-stone-700 bg-stone-100 w-5 h-5 rounded-full flex items-center justify-center mb-2 font-mono">3</span>
              <span className="text-[10px] text-stone-700 font-semibold leading-tight">Sube al Instante</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center py-4 mt-2">
          <p className="text-[10px] text-stone-400 uppercase tracking-widest">
            jorgebelr99@gmail.com
          </p>
        </footer>

      </div>

      {/* Modal de Roles Estilo Apple */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <Card variant="glass" className="max-w-xs w-full p-6 flex flex-col gap-5 relative animate-scale-up rounded-3xl border border-white/20">
            <button
              onClick={() => setShowRoleModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full bg-stone-100 text-stone-500 hover:text-stone-900 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="text-center flex flex-col items-center gap-1.5 mt-2">
              <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center border border-stone-100 mb-1">
                <Heart className="w-5 h-5 text-stone-700 fill-stone-500/5 stroke-[1.5]" />
              </div>
              <h3 className="font-serif text-lg text-stone-950 italic">¿Cómo deseas entrar?</h3>
              <p className="text-[10px] text-stone-400 font-sans uppercase tracking-widest">
                Selecciona tu tipo de acceso
              </p>
            </div>

            <div className="flex flex-col gap-3 mt-1">
              <Link href="/gallery" className="w-full">
                <Button 
                  variant="primary" 
                  className="w-full py-3.5 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Entrar como Invitado
                </Button>
              </Link>

              <Link href="/admin" className="w-full">
                <Button 
                  variant="secondary" 
                  className="w-full py-3.5 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2"
                >
                  <Lock className="w-3.5 h-3.5 text-stone-700" />
                  Entrar como Novios
                </Button>
              </Link>
            </div>
            
            <p className="text-[9px] text-stone-400 text-center uppercase tracking-wider leading-relaxed">
              Los invitados acceden libremente. Los novios requieren contraseña.
            </p>
          </Card>
        </div>
      )}

      {/* MODAL DE TUTORIAL INTERACTIVO (PASO A PASO) */}
      {activeTutorialStep !== null && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <Card variant="glass" className="max-w-sm w-full p-6 flex flex-col gap-4 relative animate-scale-up rounded-3xl border border-white/20">
            {/* Botón cerrar */}
            <button
              onClick={() => setActiveTutorialStep(null)}
              className="absolute top-4 right-4 p-1 rounded-full bg-stone-100 text-stone-500 hover:text-stone-900 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {/* Paso 1: Tutorial de Selección de Múltiples Fotos */}
            {activeTutorialStep === 1 && (
              <div className="flex flex-col gap-3 text-center items-center mt-2">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                  <ImageIcon className="w-6 h-6 stroke-[1.5]" />
                </div>
                <div>
                  <h3 className="font-serif text-lg text-stone-950 italic">1. Elige Múltiples Fotos</h3>
                  <p className="text-[10px] text-stone-400 uppercase tracking-widest font-sans mt-0.5">Tip de carga inteligente</p>
                </div>
                
                {/* Teléfono Mockup Animado */}
                <div className="relative w-[170px] h-[260px] bg-stone-900 rounded-[2.2rem] p-1.5 shadow-md border border-stone-800 my-2 overflow-hidden shrink-0 select-none">
                  {/* Pantalla Interna */}
                  <div className="relative w-full h-full bg-[#fcfbfa] rounded-[1.8rem] overflow-hidden flex flex-col p-2">
                    
                    {/* Barra de estado superior */}
                    <div className="flex justify-between items-center text-[6px] text-stone-400 font-mono px-1.5 pb-1 border-b border-stone-100">
                      <span>12:00</span>
                      <div className="flex items-center gap-0.5">
                        <span>5G</span>
                        <div className="w-3.5 h-1.5 border border-stone-300 rounded-[2px] p-[1px] flex">
                          <div className="w-2.5 h-full bg-stone-500 rounded-[1px]" />
                        </div>
                      </div>
                    </div>

                    {/* Cabecera de galería */}
                    <div className="flex justify-between items-center py-1.5 px-0.5 shrink-0">
                      <span className="text-[9px] font-bold text-stone-850">Galería de Fotos</span>
                      <span className="text-[6px] text-stone-400 font-medium">Recientes</span>
                    </div>

                    {/* Rejilla de fotos (3x3) */}
                    <div className="relative w-full grid grid-cols-3 gap-1 px-0.5 grow">
                      {/* Foto 1 (Fila 1, Col 1) - Animada */}
                      <div className="demo-photo-1 relative aspect-square rounded-lg border border-transparent overflow-hidden bg-gradient-to-br from-amber-150 to-amber-250 flex items-center justify-center">
                        <span className="text-xs">🌸</span>
                        {/* Check badge */}
                        <div className="demo-check-1 absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white text-[7px] flex items-center justify-center font-bold shadow-sm">
                          ✓
                        </div>
                      </div>

                      {/* Foto 2 (Fila 1, Col 2) - Animada */}
                      <div className="demo-photo-2 relative aspect-square rounded-lg border border-transparent overflow-hidden bg-gradient-to-br from-pink-150 to-rose-250 flex items-center justify-center">
                        <span className="text-xs">🥂</span>
                        {/* Check badge */}
                        <div className="demo-check-2 absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white text-[7px] flex items-center justify-center font-bold shadow-sm">
                          ✓
                        </div>
                      </div>

                      {/* Foto 3 (Fila 1, Col 3) - Estática */}
                      <div className="relative aspect-square rounded-lg bg-stone-100 border border-stone-150 overflow-hidden flex items-center justify-center">
                        <span className="text-xs">✨</span>
                      </div>

                      {/* Foto 4 (Fila 2, Col 1) - Estática */}
                      <div className="relative aspect-square rounded-lg bg-stone-100 border border-stone-150 overflow-hidden flex items-center justify-center">
                        <span className="text-xs">🎻</span>
                      </div>

                      {/* Foto 5 (Fila 2, Col 2) - Estática */}
                      <div className="relative aspect-square rounded-lg bg-stone-100 border border-stone-150 overflow-hidden flex items-center justify-center">
                        <span className="text-xs">🎂</span>
                      </div>

                      {/* Foto 6 (Fila 2, Col 3) - Animada */}
                      <div className="demo-photo-6 relative aspect-square rounded-lg border border-transparent overflow-hidden bg-gradient-to-br from-stone-150 to-stone-250 flex items-center justify-center">
                        <span className="text-xs">💍</span>
                        {/* Check badge */}
                        <div className="demo-check-6 absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white text-[7px] flex items-center justify-center font-bold shadow-sm">
                          ✓
                        </div>
                      </div>

                      {/* Foto 7, 8, 9 - Estáticas */}
                      <div className="relative aspect-square rounded-lg bg-stone-100 border border-stone-150 overflow-hidden flex items-center justify-center">
                        <span className="text-xs">🎈</span>
                      </div>
                      <div className="relative aspect-square rounded-lg bg-stone-100 border border-stone-150 overflow-hidden flex items-center justify-center">
                        <span className="text-xs">🍷</span>
                      </div>
                      <div className="relative aspect-square rounded-lg bg-stone-100 border border-stone-150 overflow-hidden flex items-center justify-center">
                        <span className="text-xs">💌</span>
                      </div>

                      {/* Dedo/Cursor interactivo flotante y onda expansiva */}
                      <div className="demo-finger absolute w-5 h-5 bg-white/20 border border-white/60 rounded-full shadow-lg backdrop-blur-[1px] pointer-events-none z-10 top-0 left-0">
                        {/* Onda de click */}
                        <div className="demo-ripple absolute top-1/2 left-1/2 w-8 h-8 rounded-full bg-stone-550/30 border border-stone-400/50 pointer-events-none" />
                      </div>
                    </div>

                    {/* Botón flotante inferior de añadir */}
                    <div className="mt-1.5 shrink-0 px-0.5">
                      <div className="demo-button text-[7px] py-1.5 px-2 rounded-lg font-bold text-center uppercase tracking-wider text-white shadow-sm flex items-center justify-center" />
                    </div>

                    {/* Pantalla de Éxito Overlay */}
                    <div className="demo-success-screen absolute inset-2 bg-white/95 backdrop-blur-[2px] rounded-[1.2rem] flex flex-col items-center justify-center text-center p-3 gap-1 z-20">
                      <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 text-xs">
                        ✓
                      </div>
                      <h4 className="text-[9px] font-bold text-stone-900 leading-tight">¡Fotos Enviadas!</h4>
                      <p className="text-[7px] text-stone-500 leading-tight">Tus 3 fotos se subieron juntas al álbum de la boda.</p>
                    </div>

                  </div>
                </div>

                <div className="bg-stone-50 border border-stone-100 rounded-2xl p-4 w-full text-left flex flex-col gap-2.5">
                  <div className="flex gap-2 items-center">
                    <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] flex items-center justify-center font-bold font-mono">✓</span>
                    <span className="text-[11px] text-stone-700 font-medium">¡Puedes elegir varias fotos a la vez!</span>
                  </div>
                  <p className="text-[11px] text-stone-500 leading-relaxed">
                    Al abrir la galería, **no selecciones solo una foto**. 
                  </p>
                  <p className="text-[11px] text-stone-550 leading-relaxed">
                    📱 **En tu celular:** Deja presionado tu dedo sobre la primera foto un segundo, y luego toca las demás que quieras subir para marcarlas con una palomita verde. ¡Se subirán todas agrupadas en un solo envío!
                  </p>
                </div>
              </div>
            )}

            {/* Paso 2: Tutorial de Dedicatoria y Firma */}
            {activeTutorialStep === 2 && (
              <div className="flex flex-col gap-3 text-center items-center mt-2">
                <div className="w-12 h-12 rounded-2xl bg-stone-50 border border-stone-150 flex items-center justify-center text-stone-700">
                  <FolderHeart className="w-6 h-6 stroke-[1.5]" />
                </div>
                <div>
                  <h3 className="font-serif text-lg text-stone-950 italic">2. Escribe tu Firma y Mensaje</h3>
                  <p className="text-[10px] text-stone-400 uppercase tracking-widest font-sans mt-0.5">Acompaña tus fotos con cariño</p>
                </div>
                
                <div className="bg-stone-50 border border-stone-100 rounded-2xl p-4 w-full text-left flex flex-col gap-3 mt-1">
                  <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Simulación:</span>
                  
                  {/* Mini Input con escritura animada */}
                  <div className="bg-white border border-stone-200 rounded-xl p-3 flex flex-col gap-1.5 shadow-sm">
                    <span className="text-[9px] font-semibold text-stone-500 uppercase tracking-wider">Tu dedicatoria y firma:</span>
                    <div className="w-full px-3 py-2 bg-stone-50 border border-stone-150 rounded-lg text-[10px] text-stone-700 min-h-[48px] flex flex-col gap-1 italic">
                      <div>&ldquo;¡Muchas felicidades Alicia y Fernando!&rdquo;</div>
                      <div className="text-right text-[8.5px] font-bold font-mono text-stone-500">
                        — <span className="demo-keyboard-text inline-block" />
                        <span className="w-[1.5px] h-2.5 bg-stone-700 animate-pulse inline-block align-middle" />
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-stone-550 leading-relaxed">
                    Escribe un hermoso mensaje de felicitación para **Alicia y Fernando** y firma con tu nombre o el de tu familia. ¡Aparecerá junto a tus fotos!
                  </p>
                </div>
              </div>
            )}

            {/* Paso 3: Tutorial de Subida */}
            {activeTutorialStep === 3 && (
              <div className="flex flex-col gap-3 text-center items-center mt-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <Check className="w-6 h-6 stroke-[2]" />
                </div>
                <div>
                  <h3 className="font-serif text-lg text-stone-950 italic">3. Sube al Instante</h3>
                  <p className="text-[10px] text-stone-400 uppercase tracking-widest font-sans mt-0.5">Listo para compartir</p>
                </div>
                
                <div className="bg-stone-50 border border-stone-100 rounded-2xl p-4 w-full text-left flex flex-col gap-2.5 mt-1">
                  {/* Animación estética de subida */}
                  <div className="bg-white border border-stone-200 rounded-xl p-3 flex flex-col gap-2 shadow-sm">
                    <div className="flex justify-between items-center text-[10px] font-semibold text-stone-550 uppercase tracking-wider">
                      <span>Subiendo Fotos...</span>
                      <span className="text-emerald-650 animate-pulse">85%</span>
                    </div>
                    {/* Barra de progreso animada */}
                    <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full animate-[progress-pulse_2s_infinite_ease-in-out]" style={{ width: '85%' }} />
                    </div>
                  </div>
                  <style>{`
                    @keyframes progress-pulse {
                      0%, 100% { width: 30%; }
                      50% { width: 100%; }
                    }
                  `}</style>

                  <p className="text-[11px] text-stone-500 leading-relaxed">
                    Una vez que elijas tus fotos y escribas tu grupo, pulsa el botón **&quot;Subir fotos&quot;**.
                  </p>
                  <p className="text-[11px] text-stone-550 leading-relaxed">
                    Verás el progreso de subida en tiempo real. Al finalizar, pulsa **&quot;Ver galería&quot;** para disfrutar al instante de tus fotos junto con los recuerdos de los demás invitados de forma completamente interactiva.
                  </p>
                </div>
              </div>
            )}

            <Button
              onClick={() => setActiveTutorialStep(null)}
              variant="primary"
              className="w-full mt-3 rounded-2xl text-xs py-3"
            >
              ¡Entendido!
            </Button>
          </Card>
        </div>
      )}
    </main>
  );
}
