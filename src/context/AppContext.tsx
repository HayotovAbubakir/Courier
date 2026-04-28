import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';
import { Alert } from '@/components/ui';
import { translations } from '@/lib/i18n';

export type Theme = 'light' | 'dark';
const THEME_STORAGE_KEY = 'theme';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  type: ToastType;
  title?: string;
  message: string;
  durationMs?: number;
}

interface AppContextType {
  t: (key: keyof typeof translations.uz) => string;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  showToast: (toast: ToastOptions) => void;
  hideToast: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  return window.localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark';
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
  root.style.colorScheme = theme;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme());
  const [toast, setToast] = useState<(ToastOptions & { id: number }) | null>(null);

  const t = (key: keyof typeof translations.uz): string => {
    return translations.uz[key] ?? key;
  };

  useLayoutEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (nextTheme: Theme) => {
    setThemeState(nextTheme);
  };

  const toggleTheme = () => {
    setThemeState((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  };

  const showToast = (nextToast: ToastOptions) => {
    setToast({
      ...nextToast,
      id: Date.now() + Math.random(),
    });
  };

  const hideToast = () => {
    setToast(null);
  };

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToast((currentToast) => (currentToast?.id === toast.id ? null : currentToast));
    }, toast.durationMs ?? 3200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toast]);

  return (
    <AppContext.Provider value={{ t, theme, setTheme, toggleTheme, showToast, hideToast }}>
      {children}
      {toast && (
        <div className="pointer-events-none fixed bottom-4 left-4 z-[70] w-[calc(100vw-2rem)] max-w-xs sm:max-w-sm">
          <div className="pointer-events-auto">
            <Alert
              type={toast.type}
              title={toast.title}
              message={toast.message}
              onClose={hideToast}
              compact
              className="shadow-lg shadow-black/10"
            />
          </div>
        </div>
      )}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }

  return context;
}
