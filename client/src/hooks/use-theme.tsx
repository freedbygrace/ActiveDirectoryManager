import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'dark' | 'light' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'dark' | 'light';
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
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>(
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

  // Apply the theme to the document
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    let effectiveTheme: 'light' | 'dark';
    
    if (theme === 'system') {
      effectiveTheme = resolvedTheme;
    } else {
      effectiveTheme = theme as 'light' | 'dark';
    }
    
    root.classList.add(effectiveTheme);

    // Add a transition for smoother theme changes
    root.style.colorScheme = effectiveTheme;
    
    // Set meta theme-color for mobile browsers
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content', 
      effectiveTheme === 'dark' ? '#020817' : '#ffffff'
    );
  }, [theme, resolvedTheme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Define handler for system theme changes
    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      const newSystemTheme = event.matches ? 'dark' : 'light';
      setResolvedTheme(newSystemTheme);
      
      // Log the change for debugging
      console.log(`System theme changed to ${newSystemTheme}`);
    };
    
    // Add listener for system theme changes
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    
    // Clean up listener on component unmount
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  const value = {
    theme,
    resolvedTheme,
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
    const resolvedSystemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
    
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
    
    const getResolvedTheme = (theme: Theme): 'light' | 'dark' => {
      if (theme === 'system') {
        return resolvedSystemTheme;
      }
      return theme as 'light' | 'dark';
    };
    
    const applyThemeToDOM = (newTheme: Theme) => {
      try {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        
        const effectiveTheme = getResolvedTheme(newTheme);
        root.classList.add(effectiveTheme);
        
        // Add a transition for smoother theme changes
        root.style.colorScheme = effectiveTheme;
        
        // Set meta theme-color for mobile browsers
        document.querySelector('meta[name="theme-color"]')?.setAttribute(
          'content', 
          effectiveTheme === 'dark' ? '#020817' : '#ffffff'
        );
      } catch (e) {
        console.error('Error applying theme to DOM:', e);
      }
    };
    
    // Apply the theme immediately for this component
    applyThemeToDOM(currentTheme);
    
    // Return a fallback implementation
    return {
      theme: currentTheme,
      resolvedTheme: getResolvedTheme(currentTheme),
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