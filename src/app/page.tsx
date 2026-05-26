'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Camera, Heart, Sparkles, Lock, Eye, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Home() {
  const [showRoleModal, setShowRoleModal] = useState(false);

  return (
    <main className="min-h-screen py-10 px-4 flex flex-col items-center justify-center bg-[#fcfbfa]">
      <div className="w-full max-w-md flex flex-col gap-8 animate-fade-in">
        
        {/* Tarjeta de Bienvenida Principal */}
        <Card variant="glass" className="text-center py-12 px-6 flex flex-col items-center gap-6 relative overflow-hidden">
          
          {/* Adorno de fondo estilo brillo */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-stone-100/50 rounded-full blur-3xl pointer-events-none" />
          
          {/* Iconos de Amor y Cámara */}
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-stone-50 flex items-center justify-center border border-stone-100 shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
              <Camera className="w-8 h-8 text-stone-700 stroke-[1.2]" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center shadow-sm">
              <Heart className="w-3.5 h-3.5 text-amber-600 fill-amber-500/10" />
            </div>
          </div>

          {/* Textos de Bienvenida */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[10px] font-sans font-bold tracking-widest text-stone-400 uppercase">
              Bienvenidos a Nuestra Boda
            </span>
            <h1 className="font-serif text-4xl text-stone-900 italic tracking-tight font-light leading-snug">
              Naomi &amp; Carlos
            </h1>
            <div className="h-[1px] w-12 bg-stone-200 mx-auto my-1" />
            <p className="text-sm text-stone-500 font-serif italic">
              &ldquo;El amor se compone de una sola alma que habita en dos cuerpos.&rdquo;
            </p>
          </div>

          <p className="text-xs text-stone-500 leading-relaxed font-sans max-w-[280px]">
            ¡Queremos recordar cada instante! Escanea el código o pulsa el botón para compartir tus fotos o revivir los recuerdos compartidos.
          </p>

          {/* Botones principales */}
          <div className="w-full flex flex-col gap-3 mt-2">
            <Link href="/upload" className="w-full">
              <Button variant="primary" className="w-full py-4 text-sm font-semibold rounded-2xl flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-300 fill-amber-350/20" />
                Subir mis fotos
              </Button>
            </Link>

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

        {/* Pequeña tarjeta con instrucciones rápidas */}
        <div className="flex flex-col gap-3 px-2">
          <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest text-center">
            ¿Cómo funciona?
          </h3>
          
          <div className="grid grid-cols-3 gap-3 text-center mt-1">
            <div className="flex flex-col items-center p-2 bg-white/40 rounded-2xl border border-stone-100">
              <span className="text-xs font-bold text-stone-700 bg-stone-100 w-5 h-5 rounded-full flex items-center justify-center mb-1.5 font-mono">1</span>
              <span className="text-[10px] text-stone-600 font-medium">Toma Fotos</span>
            </div>
            <div className="flex flex-col items-center p-2 bg-white/40 rounded-2xl border border-stone-100">
              <span className="text-xs font-bold text-stone-700 bg-stone-100 w-5 h-5 rounded-full flex items-center justify-center mb-1.5 font-mono">2</span>
              <span className="text-[10px] text-stone-600 font-medium">Elige Carpeta</span>
            </div>
            <div className="flex flex-col items-center p-2 bg-white/40 rounded-2xl border border-stone-100">
              <span className="text-xs font-bold text-stone-700 bg-stone-100 w-5 h-5 rounded-full flex items-center justify-center mb-1.5 font-mono">3</span>
              <span className="text-[10px] text-stone-600 font-medium">Sube al Instante</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center py-4 mt-2">
          <p className="text-[10px] text-stone-400 uppercase tracking-widest">
            jorgebelr99@gmail.com
          </p>
        </footer>

      </div>

      {/* Modal de Roles Estilo Apple (Bottom Sheet / iOS Modal) */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <Card variant="glass" className="max-w-xs w-full p-6 flex flex-col gap-5 relative animate-scale-up rounded-3xl border border-white/20">
            {/* Botón cerrar */}
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
              {/* Opción Invitado */}
              <Link href="/gallery" className="w-full">
                <Button 
                  variant="primary" 
                  className="w-full py-3.5 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Entrar como Invitado
                </Button>
              </Link>

              {/* Opción Novios */}
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
    </main>
  );
}
