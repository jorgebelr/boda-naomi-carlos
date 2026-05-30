import { supabase } from './supabase';

export type WeddingTheme = 'stone' | 'rose' | 'emerald' | 'amber';

export interface WeddingSettings {
  id: string;
  cover_photo_url: string | null;
  cover_photo_path: string | null;
  profile_photo_url: string | null;
  profile_photo_path: string | null;
  theme_color: WeddingTheme;
  updated_at: string;
}

export interface ThemeColors {
  name: string;
  bgClass: string;          // Page background
  primaryBtn: string;       // Primary button styles
  primaryText: string;      // Core text emphasis
  secondaryText: string;    // Subtext theme tint
  accentBg: string;         // Light background tint (e.g. cards/tutorial steps)
  accentBorder: string;     // Border theme tint
  heartColor: string;       // Heart icon text-color
  heartFill: string;        // Heart icon fill-color
  accentBadge: string;      // Badge classes
  hoverText: string;        // Hover text tint
}

export const THEMES: Record<WeddingTheme, ThemeColors> = {
  stone: {
    name: 'Cantera / Neutro',
    bgClass: 'bg-[#fcfbfa]',
    primaryBtn: 'bg-stone-900 text-stone-50 hover:bg-stone-800 active:bg-stone-955',
    primaryText: 'text-stone-900',
    secondaryText: 'text-stone-500',
    accentBg: 'bg-stone-50',
    accentBorder: 'border-stone-200',
    heartColor: 'text-stone-500',
    heartFill: 'fill-stone-500/10',
    accentBadge: 'bg-stone-100/75 border border-stone-200 text-stone-700',
    hoverText: 'hover:text-stone-900',
  },
  rose: {
    name: 'Rosa Romántico',
    bgClass: 'bg-[#fdfafb]',
    primaryBtn: 'bg-rose-700 text-white hover:bg-rose-600 active:bg-rose-800',
    primaryText: 'text-rose-950',
    secondaryText: 'text-rose-600',
    accentBg: 'bg-rose-50/40',
    accentBorder: 'border-rose-150',
    heartColor: 'text-rose-500',
    heartFill: 'fill-rose-500/10',
    accentBadge: 'bg-rose-50/70 border border-rose-100 text-rose-700',
    hoverText: 'hover:text-rose-800',
  },
  emerald: {
    name: 'Verde Esmeralda',
    bgClass: 'bg-[#fafdfb]',
    primaryBtn: 'bg-emerald-800 text-white hover:bg-emerald-700 active:bg-emerald-900',
    primaryText: 'text-emerald-950',
    secondaryText: 'text-emerald-600',
    accentBg: 'bg-emerald-50/40',
    accentBorder: 'border-emerald-150',
    heartColor: 'text-emerald-500',
    heartFill: 'fill-emerald-500/10',
    accentBadge: 'bg-emerald-50/70 border border-emerald-100 text-emerald-700',
    hoverText: 'hover:text-emerald-800',
  },
  amber: {
    name: 'Oro Cálido',
    bgClass: 'bg-[#fdfbfa]',
    primaryBtn: 'bg-amber-600 text-white hover:bg-amber-500 active:bg-amber-750',
    primaryText: 'text-amber-950',
    secondaryText: 'text-amber-600',
    accentBg: 'bg-amber-50/40',
    accentBorder: 'border-amber-150',
    heartColor: 'text-amber-500',
    heartFill: 'fill-amber-500/10',
    accentBadge: 'bg-amber-50/70 border border-amber-100 text-amber-700',
    hoverText: 'hover:text-amber-800',
  },
};

// Cargar ajustes de la base de datos (con fallback si no está configurada)
export async function getWeddingSettings(): Promise<WeddingSettings> {
  const defaultSettings: WeddingSettings = {
    id: 'main',
    cover_photo_url: null,
    cover_photo_path: null,
    profile_photo_url: null,
    profile_photo_path: null,
    theme_color: 'stone',
    updated_at: new Date().toISOString(),
  };

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key || url.includes('your-project-id')) {
      return defaultSettings;
    }

    const { data, error } = await supabase
      .from('wedding_settings')
      .select('*')
      .eq('id', 'main')
      .maybeSingle();

    if (error) {
      console.warn('Error fetching wedding settings, using defaults:', error.message);
      return defaultSettings;
    }

    if (!data) {
      return defaultSettings;
    }

    return data as WeddingSettings;
  } catch (err) {
    console.error('Unexpected error loading wedding settings:', err);
    return defaultSettings;
  }
}

// Guardar ajustes de la base de datos (requiere autenticación)
export async function updateWeddingSettings(settings: Partial<WeddingSettings>): Promise<WeddingSettings> {
  const { data, error } = await supabase
    .from('wedding_settings')
    .update({
      ...settings,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 'main')
    .select()
    .single();

  if (error) throw error;
  return data as WeddingSettings;
}
