import { createContext, useContext, useEffect, useState } from 'react';
import type { AppThemeMode, AppColorTheme, User } from '../types/auth';

import { useAuth } from './AuthContext';
import { apiFetch } from '../services/api';

export const COLOR_PRESETS: Record<AppColorTheme, { name: string; hex: string; hover: string }> = {
  indigo: { name: 'Warm Mocha & Caramel', hex: '#77574A', hover: '#5D4338' },
  blue: { name: 'Ocean Blue', hex: '#3b82f6', hover: '#2563eb' },
  purple: { name: 'Deep Purple', hex: '#a855f7', hover: '#9333ea' },
  cyan: { name: 'Almond Sand', hex: '#D0AE92', hover: '#BA987D' },
  green: { name: 'Emerald', hex: '#10b981', hover: '#059669' },
  rose: { name: 'Rose', hex: '#f43f5e', hover: '#e11d48' },
  orange: { name: 'Warm Caramel', hex: '#A8836C', hover: '#8F6C56' },
  custom: { name: 'Custom Hex', hex: '#A8836C', hover: '#8F6C56' },
};

interface ThemeContextType {
  mode: AppThemeMode;
  colorPreset: AppColorTheme;
  customHex: string;
  setThemeMode: (mode: AppThemeMode) => Promise<void>;
  setColorPreset: (preset: AppColorTheme) => Promise<void>;
  setCustomHexColor: (hex: string) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, updateUserLocal } = useAuth();

  const [mode, setMode] = useState<AppThemeMode>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paramTheme = urlParams.get('theme') as AppThemeMode;
    if (paramTheme === 'dark' || paramTheme === 'light') return paramTheme;
    return (localStorage.getItem('presentai_theme_mode') as AppThemeMode) || 'light';
  });

  const [colorPreset, setColorPresetState] = useState<AppColorTheme>(() => {
    return (localStorage.getItem('presentai_color_preset') as AppColorTheme) || 'indigo';
  });

  const [customHex, setCustomHex] = useState<string>(() => {
    return localStorage.getItem('presentai_custom_hex') || '#77574A';
  });

  // Sync theme settings when logged-in user state changes
  useEffect(() => {
    if (user) {
      if (user.app_theme_mode) setMode(user.app_theme_mode);
      if (user.app_color_theme) setColorPresetState(user.app_color_theme);
      if (user.custom_primary_color) setCustomHex(user.custom_primary_color);
    }
  }, [user]);

  // Apply CSS root variables and theme classes dynamically to documentElement
  useEffect(() => {
    const root = document.documentElement;

    // Mode class (Dark / Light)
    const applyMode = (isDark: boolean) => {
      if (isDark) {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
      }
    };

    let mediaQuery: MediaQueryList | null = null;
    let listener: ((e: MediaQueryListEvent) => void) | null = null;

    if (mode === 'dark') {
      applyMode(true);
    } else if (mode === 'light') {
      applyMode(false);
    } else {
      // System mode
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyMode(mediaQuery.matches);

      listener = (e: MediaQueryListEvent) => {
        applyMode(e.matches);
      };
      mediaQuery.addEventListener('change', listener);
    }

    // Determine primary color
    let primaryHex = COLOR_PRESETS[colorPreset]?.hex || '#77574A';
    let hoverHex = COLOR_PRESETS[colorPreset]?.hover || '#5D4338';

    if (colorPreset === 'indigo') {
      if (mode === 'dark') {
        primaryHex = '#8C7D70';
        hoverHex = '#A39487';
      } else {
        primaryHex = '#77574A';
        hoverHex = '#5D4338';
      }
    }

    if (colorPreset === 'custom' && customHex) {
      primaryHex = customHex;
      hoverHex = customHex;
    }

    // Set CSS variables
    root.style.setProperty('--color-primary', primaryHex);
    root.style.setProperty('--color-primary-hover', hoverHex);
    root.style.setProperty('--color-primary-glow', `${primaryHex}33`);
    
    if (mode === 'dark') {
      root.style.setProperty('--bg-color', '#332D28');
      root.style.setProperty('--card-bg', '#3E3731');
      root.style.setProperty('--text-color', '#FFFFFF');
      root.style.setProperty('--text-muted', '#F5EEE8');
      root.style.setProperty('--card-border', 'rgba(140, 125, 112, 0.40)');
      root.style.setProperty('--border-color', 'rgba(140, 125, 112, 0.35)');
      root.style.setProperty('--taupe-bronze', '#8C7D70');
      root.style.setProperty('--taupe-bronze-rgb', '140, 125, 112');
      root.style.setProperty('--warm-caramel', '#8C7D70');
      root.style.setProperty('--warm-caramel-rgb', '140, 125, 112');
      root.style.setProperty('--accent-gold', '#8C7D70');
      root.style.setProperty('--dark-charcoal-primary', '#332D28');
      root.style.setProperty('--dark-charcoal-secondary', '#3E3731');
      root.style.setProperty('--dark-charcoal-elevated', '#484039');
      root.style.setProperty('--muted-bronze-border', 'rgba(140, 125, 112, 0.40)');
      root.style.setProperty('--ivory-white', '#FFFFFF');
    } else {
      root.style.setProperty('--bg-color', '#FDFBF7');
      root.style.setProperty('--card-bg', '#FFFFFF');
      root.style.setProperty('--text-color', '#2D2320');
      root.style.setProperty('--text-muted', '#77574A');
      root.style.setProperty('--card-border', 'rgba(208, 174, 146, 0.40)');
      root.style.setProperty('--border-color', 'rgba(208, 174, 146, 0.35)');
      root.style.setProperty('--warm-caramel', '#A8836C');
      root.style.setProperty('--warm-caramel-rgb', '168, 131, 108');
    }

    // Cache locally for instant loading before JS hydrations
    localStorage.setItem('presentai_theme_mode', mode);
    localStorage.setItem('presentai_color_preset', colorPreset);
    if (customHex) localStorage.setItem('presentai_custom_hex', customHex);

    return () => {
      if (mediaQuery && listener) {
        mediaQuery.removeEventListener('change', listener);
      }
    };
  }, [mode, colorPreset, customHex]);

  const saveThemeToBackendOrLocal = async (
    newMode: AppThemeMode,
    newPreset: AppColorTheme,
    newHex: string
  ) => {
    if (user) {
      try {
        const updatedUser = await apiFetch<User>('/users/me/theme', {
          method: 'PUT',
          body: JSON.stringify({
            app_theme_mode: newMode,
            app_color_theme: newPreset,
            custom_primary_color: newHex,
          }),
        });
        updateUserLocal(updatedUser);
      } catch (err) {
        console.error('Failed to persist theme settings:', err);
      }
    }
  };

  const setThemeMode = async (newMode: AppThemeMode) => {
    setMode(newMode);
    await saveThemeToBackendOrLocal(newMode, colorPreset, customHex);
  };

  const setColorPreset = async (newPreset: AppColorTheme) => {
    setColorPresetState(newPreset);
    await saveThemeToBackendOrLocal(mode, newPreset, customHex);
  };

  const setCustomHexColor = async (hex: string) => {
    setCustomHex(hex);
    setColorPresetState('custom');
    await saveThemeToBackendOrLocal(mode, 'custom', hex);
  };

  return (
    <ThemeContext.Provider
      value={{
        mode,
        colorPreset,
        customHex,
        setThemeMode,
        setColorPreset,
        setCustomHexColor,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
