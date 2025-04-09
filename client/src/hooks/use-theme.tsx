import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'dark' | 'light' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'ui-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      
      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
  };

  return (
    <ThemeContext.Provider value={value} {...props}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    // Fallback implementation that doesn't rely on context
    // This prevents crashes but won't sync across components
    const storageKey = 'ad-management-theme';
    const defaultTheme = 'system';
    
    // Create a fallback state using localStorage
    const getThemeFromStorage = (): Theme => {
      try {
        const storedTheme = localStorage.getItem(storageKey);
        return (storedTheme as Theme) || defaultTheme;
      } catch (e) {
        return defaultTheme;
      }
    };
    
    const currentTheme = getThemeFromStorage();
    
    const applyThemeToDOM = (newTheme: Theme) => {
      try {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        
        if (newTheme === 'system') {
          const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
          root.classList.add(systemTheme);
        } else {
          root.classList.add(newTheme);
        }
      } catch (e) {
        console.error('Error applying theme to DOM:', e);
      }
    };
    
    // Apply the theme immediately for this component
    applyThemeToDOM(currentTheme);
    
    // Return a fallback implementation
    return {
      theme: currentTheme,
      setTheme: (newTheme: Theme) => {
        try {
          localStorage.setItem(storageKey, newTheme);
          applyThemeToDOM(newTheme);
          
          // We can't update state here because we're not in a React component
          // but we can apply the theme directly to the DOM
          console.warn(
            'Theme changed outside of ThemeProvider context. ' +
            'This change won\'t be synced between components.'
          );
        } catch (e) {
          console.error('Error setting theme:', e);
        }
      }
    };
  }
  
  return context;
};