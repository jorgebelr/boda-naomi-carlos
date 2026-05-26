'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { useAdminAuth } from '@/lib/auth-hook';

export default function AdminLoginPage() {
  const router = useRouter();
  const { loading } = useAdminAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [isSigningOut, setIsSigningOut] = useState(true);

  // Forzar el cierre de sesión al cargar la página de login
  // Esto garantiza que siempre deban iniciar sesión cada vez que entran a /admin
  useEffect(() => {
    supabase.auth.signOut()
      .then(() => {
        setIsSigningOut(false);
      })
      .catch((err) => {
        console.warn('Error al limpiar sesión antigua:', err);
        setIsSigningOut(false);
      });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Por favor ingresa tu correo y contraseña.');
      return;
    }

    setErrorMsg(null);
    setIsLoggingIn(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        // Traducir mensajes comunes de error
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Credenciales inválidas. Revisa tu correo y contraseña.');
        }
        throw error;
      }

      // Supabase Auth maneja la sesión. El useEffect de arriba o esta línea redirigirá al dashboard
      router.push('/admin/dashboard');
    } catch (err: unknown) {
      console.error('Error de login:', err);
      const error = err as Error;
      setErrorMsg(error.message || 'Ocurrió un error inesperado al intentar iniciar sesión.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (isSigningOut || loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#fcfbfa]">
        <div className="flex flex-col items-center gap-3 text-stone-500">
          <svg className="animate-spin h-6 w-6 text-stone-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-xs uppercase tracking-wider">Cargando sesión...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen py-10 px-4 flex flex-col items-center justify-center bg-[#fcfbfa]">
      <div className="w-full max-w-sm flex flex-col gap-6">
        
        {/* Botón de regreso a Home */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-700 transition-colors duration-200 self-start ml-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al inicio</span>
        </Link>

        {/* Tarjeta de login */}
        <Card variant="glass" className="p-8 flex flex-col gap-6 relative overflow-hidden">
          <div className="absolute -top-12 -left-12 w-28 h-28 bg-stone-50 rounded-full blur-2xl pointer-events-none" />
          
          <div className="text-center flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-stone-900 text-stone-50 flex items-center justify-center mb-1 shadow-sm">
              <Lock className="w-4 h-4 stroke-[1.8]" />
            </div>
            <h1 className="font-serif text-2xl text-stone-950 italic">Área Privada</h1>
            <p className="text-[11px] font-sans text-stone-400 uppercase tracking-widest">
              Panel de Control para los Novios
            </p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            
            {/* Input Correo */}
            <div className="relative flex flex-col">
              <Input
                label="Correo Electrónico"
                placeholder="novios@ejemplo.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoggingIn}
                required
              />
            </div>

            {/* Input Contraseña */}
            <div className="relative flex flex-col">
              <Input
                label="Contraseña"
                placeholder="••••••••"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoggingIn}
                required
              />
            </div>

            {/* Alerta de Error */}
            {errorMsg && (
              <div className="flex gap-2 p-3 rounded-2xl bg-red-50 border border-red-100 text-red-650 text-xs items-center leading-relaxed animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Botón de Enviar */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2 font-semibold rounded-2xl py-3.5 text-sm"
              isLoading={isLoggingIn}
            >
              Iniciar Sesión
            </Button>
          </form>
        </Card>

        {/* Instrucciones de ayuda rápidas */}
        <div className="px-4 text-center">
          <p className="text-[10px] text-stone-400 leading-relaxed uppercase tracking-wider">
            Para configurar tu primer acceso, regístrate en la consola de Supabase Auth e inicia sesión aquí.
          </p>
        </div>
      </div>
    </main>
  );
}
