import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export type ColorPalette = {
  id: string;
  name: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  accent: string;
  accentLight: string;
};

export const colorPalettes: ColorPalette[] = [
  {
    id: 'emerald',
    name: 'Esmeralda',
    primary: '#10b981',
    primaryLight: '#34d399',
    primaryDark: '#059669',
    accent: '#3b82f6',
    accentLight: '#60a5fa',
  },
  {
    id: 'blue',
    name: 'Azul',
    primary: '#3b82f6',
    primaryLight: '#60a5fa',
    primaryDark: '#2563eb',
    accent: '#8b5cf6',
    accentLight: '#a78bfa',
  },
  {
    id: 'purple',
    name: 'Púrpura',
    primary: '#8b5cf6',
    primaryLight: '#a78bfa',
    primaryDark: '#7c3aed',
    accent: '#ec4899',
    accentLight: '#f472b6',
  },
  {
    id: 'pink',
    name: 'Rosa',
    primary: '#ec4899',
    primaryLight: '#f472b6',
    primaryDark: '#db2777',
    accent: '#f59e0b',
    accentLight: '#fbbf24',
  },
  {
    id: 'orange',
    name: 'Naranja',
    primary: '#f59e0b',
    primaryLight: '#fbbf24',
    primaryDark: '#d97706',
    accent: '#ef4444',
    accentLight: '#f87171',
  },
  {
    id: 'red',
    name: 'Rojo',
    primary: '#ef4444',
    primaryLight: '#f87171',
    primaryDark: '#dc2626',
    accent: '#10b981',
    accentLight: '#34d399',
  },
  {
    id: 'teal',
    name: 'Turquesa',
    primary: '#14b8a6',
    primaryLight: '#2dd4bf',
    primaryDark: '#0d9488',
    accent: '#6366f1',
    accentLight: '#818cf8',
  },
  {
    id: 'cyan',
    name: 'Cian',
    primary: '#06b6d4',
    primaryLight: '#22d3ee',
    primaryDark: '#0891b2',
    accent: '#8b5cf6',
    accentLight: '#a78bfa',
  },
];

export type ThemeMode = 'light' | 'dark';

export type BackgroundPattern = {
  id: string;
  name: string;
  svg: string; // SVG pattern definition
};

export const backgroundPatterns: BackgroundPattern[] = [
  {
    id: 'none',
    name: 'Sin Patrón',
    svg: '',
  },
  {
    id: 'cats',
    name: 'Gatitos',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" width="160" height="160" viewBox="0 0 497 536">

 <g fill="currentColor" fill-opacity="0.1">
  <path  d="M354 55c-1,-7 -1,-57 -8,-55 -3,1 -7,19 -11,29 -3,0 -7,0 -11,0 -7,-28 -10,-46 -18,-4 -3,13 -6,27 -5,41 1,6 6,7 10,7 10,0 19,-2 29,-2 12,0 15,-5 14,-16z"/>
  <path  d="M221 68c-3,0 -8,20 -11,29 -5,1 -9,1 -13,1 -2,-7 -5,-14 -8,-22 -2,-6 -5,-6 -7,1 -6,19 -9,33 -10,54 0,7 0,17 9,18 13,1 27,0 41,-3 9,-1 8,-7 8,-15 0,-8 -2,-63 -9,-63z"/>
  <path  d="M344 182c-3,1 -13,25 -14,29 -3,0 -6,0 -9,0 -1,-3 -4,-29 -8,-28 -5,2 -23,53 -13,64 4,6 11,5 24,5 11,0 22,1 25,-7 3,-8 -1,-64 -5,-63z"/>
  <path  d="M475 73c-2,-1 -9,17 -11,26 -7,-1 -12,-1 -19,-2 -1,-19 -3,-27 -6,-27 -2,0 -21,52 -14,63 2,3 9,3 12,3 8,1 20,2 28,2 4,0 11,-1 12,-7 1,-6 2,-57 -2,-58z"/>
  <path  d="M94 519c0,-9 -2,-19 -4,-28 0,-1 -7,-28 -9,-23 -3,6 -4,15 -6,24 -5,0 -9,1 -13,2 -3,-7 -6,-15 -11,-21 -3,-4 -3,2 -4,4 -1,10 -1,20 -1,30 0,9 -1,17 0,26 1,4 6,3 10,3 7,0 15,-1 22,-1 15,-1 17,0 16,-16z"/>
  <path  d="M83 109c1,-11 -2,-22 -5,-33 0,-2 -8,-36 -11,-29 -5,10 -4,18 -7,28 -5,0 -10,0 -15,0 -4,-9 -7,-18 -13,-26 -3,-5 -4,3 -4,5 -2,11 -1,23 -2,35 0,10 0,20 1,30 0,6 7,7 11,7 9,0 20,-1 28,-2 15,-1 17,-4 17,-15z"/>
  <path  d="M55 381c1,-16 -1,-31 -5,-47 -1,-2 -6,-19 -8,-13 -4,9 -5,19 -8,28 -4,0 -9,0 -13,0 -1,-4 -9,-30 -13,-29 -5,0 -8,60 -8,68 0,2 0,4 2,6 3,2 7,2 11,2 12,1 23,1 35,1 8,0 7,-10 7,-16z"/>
  <path  d="M109 179c-5,6 -8,21 -11,28 -7,0 -14,0 -20,0 -1,-5 -5,-37 -9,-28 -5,11 -17,58 -11,69 4,6 43,6 50,3 4,-2 4,-6 4,-9 3,-15 3,-72 -3,-63z"/>
  <path  d="M442 276c-1,-11 2,-22 5,-32 0,-2 8,-35 11,-28 4,9 3,17 6,27 5,0 10,0 15,0 4,-8 7,-17 12,-25 4,-5 4,2 4,4 2,12 2,23 2,35 0,9 1,19 0,29 -1,5 -7,6 -11,6 -9,0 -19,0 -28,-1 -14,-2 -16,-5 -16,-15z"/>
  <path  d="M166 323c1,-6 1,-55 8,-53 3,1 7,18 11,27 3,0 7,0 10,0 7,-28 10,-45 18,-6 3,14 6,27 5,41 -1,5 -6,7 -10,7 -10,0 -19,-1 -28,-1 -11,1 -14,-3 -14,-15z"/>
  <path  d="M181 496c-1,-11 2,-22 5,-33 0,-2 8,-36 11,-29 5,10 4,17 7,27 5,0 10,1 15,1 4,-9 7,-18 13,-26 3,-5 4,2 4,5 2,11 1,23 2,35 0,10 0,20 -1,30 0,5 -7,6 -11,7 -9,0 -20,-1 -28,-2 -15,-2 -17,-4 -17,-15z"/>
  <path  d="M321 340c5,6 7,23 10,30 8,-1 15,0 22,0 1,-5 6,-39 10,-29 5,11 16,60 9,72 -4,6 -45,6 -52,3 -4,-2 -5,-6 -5,-10 -2,-16 0,-75 6,-66z"/>
  <path  d="M434 511c1,-15 5,-31 10,-46 1,-2 8,-19 9,-12 3,10 3,19 5,29 4,0 9,0 14,1 1,-4 11,-29 15,-28 5,1 2,61 1,68 0,2 0,5 -2,6 -3,3 -8,2 -12,2 -11,0 -23,-2 -35,-3 -7,-1 -6,-11 -5,-17z"/>
 </g>
</svg>`,
  },
  {
    id: 'fish',
    name: 'Pescaditos',
    svg: `<svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
      <g fill="currentColor" fill-opacity="0.06">
        <path d="M15 20 L25 18 L28 20 L25 22 L15 20 Z M12 20 L10 17 L12 16 L14 19 Z M12 20 L10 23 L12 24 L14 21 Z"/>
        <path d="M40 45 L50 43 L53 45 L50 47 L40 45 Z M37 45 L35 42 L37 41 L39 44 Z M37 45 L35 48 L37 49 L39 46 Z"/>
      </g>
    </svg>`,
  },
  {
    id: 'paws',
    name: 'Huellas',
    svg: `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <g fill="currentColor" fill-opacity="0.1">
        <ellipse cx="25" cy="25" rx="4" ry="5" transform="rotate(-20 25 25)"/>
        <ellipse cx="35" cy="23" rx="4" ry="5" transform="rotate(10 35 23)"/>
        <ellipse cx="30" cy="33" rx="5" ry="6"/>
        <ellipse cx="22" cy="30" rx="3" ry="4" transform="rotate(-30 22 30)"/>
        <ellipse cx="38" cy="30" rx="3" ry="4" transform="rotate(30 38 30)"/>

        <ellipse cx="65" cy="70" rx="4" ry="5" transform="rotate(-20 65 70)"/>
        <ellipse cx="75" cy="68" rx="4" ry="5" transform="rotate(10 75 68)"/>
        <ellipse cx="70" cy="78" rx="5" ry="6"/>
        <ellipse cx="62" cy="75" rx="3" ry="4" transform="rotate(-30 62 75)"/>
        <ellipse cx="78" cy="75" rx="3" ry="4" transform="rotate(30 78 75)"/>
      </g>
    </svg>`,
  },
  {
    id: 'hearts',
    name: 'Corazones',
    svg: `<svg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
      <g fill="currentColor" fill-opacity="0.1">
        <path d="M20 25 C20 20 25 18 28 22 C31 18 36 20 36 25 C36 30 28 35 28 35 C28 35 20 30 20 25 Z"/>
        <path d="M50 55 C50 50 55 48 58 52 C61 48 66 50 66 55 C66 60 58 65 58 65 C58 65 50 60 50 55 Z"/>
      </g>
    </svg>`,
  },
  {
    id: 'stars',
    name: 'Estrellas',
    svg: `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <g fill="currentColor" fill-opacity="0.1">
        <path d="M25 15 L27 22 L34 22 L28 27 L30 34 L25 29 L20 34 L22 27 L16 22 L23 22 Z"/>
        <path d="M70 60 L72 67 L79 67 L73 72 L75 79 L70 74 L65 79 L67 72 L61 67 L68 67 Z"/>
        <circle cx="50" cy="20" r="3"/>
        <circle cx="20" cy="70" r="2"/>
        <circle cx="80" cy="30" r="2"/>
      </g>
    </svg>`,
  },
  {
    id: 'dots',
    name: 'Puntos',
    svg: `<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <g fill="currentColor" fill-opacity="0.1">
        <circle cx="10" cy="10" r="2"/>
        <circle cx="30" cy="10" r="2"/>
        <circle cx="10" cy="30" r="2"/>
        <circle cx="30" cy="30" r="2"/>
        <circle cx="20" cy="20" r="2"/>
      </g>
    </svg>`,
  },
];

type ThemeContextType = {
  palette: ColorPalette;
  setPalette: (paletteId: string) => void;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  pattern: BackgroundPattern;
  setPattern: (patternId: string) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [palette, setPaletteState] = useState<ColorPalette>(() => {
    const saved = localStorage.getItem('colorPalette');
    if (saved) {
      const found = colorPalettes.find(p => p.id === saved);
      if (found) return found;
    }
    return colorPalettes[0]; // Default to emerald
  });

  const [mode, setModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('themeMode');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  const [pattern, setPatternState] = useState<BackgroundPattern>(() => {
    const saved = localStorage.getItem('backgroundPattern');
    if (saved) {
      const found = backgroundPatterns.find(p => p.id === saved);
      if (found) return found;
    }
    return backgroundPatterns[0]; // Default to none
  });

  const setPalette = (paletteId: string) => {
    const found = colorPalettes.find(p => p.id === paletteId);
    if (found) {
      setPaletteState(found);
      localStorage.setItem('colorPalette', paletteId);
    }
  };

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem('themeMode', newMode);
  };

  const setPattern = (patternId: string) => {
    const found = backgroundPatterns.find(p => p.id === patternId);
    if (found) {
      setPatternState(found);
      localStorage.setItem('backgroundPattern', patternId);
    }
  };

  // Apply CSS variables and background pattern to root
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', palette.primary);
    root.style.setProperty('--color-primary-light', palette.primaryLight);
    root.style.setProperty('--color-primary-dark', palette.primaryDark);
    root.style.setProperty('--color-accent', palette.accent);
    root.style.setProperty('--color-accent-light', palette.accentLight);

    // Apply theme mode classes
    if (mode === 'light') {
      root.classList.add('light-mode');
      root.classList.remove('dark-mode');
    } else {
      root.classList.add('dark-mode');
      root.classList.remove('light-mode');
    }

    // Apply background pattern
    if (pattern.svg) {
      const encodedSvg = encodeURIComponent(pattern.svg.replace(/currentColor/g, palette.primary));
      root.style.setProperty('--background-pattern', `url("data:image/svg+xml,${encodedSvg}")`);
      root.classList.add('has-pattern');
    } else {
      root.style.removeProperty('--background-pattern');
      root.classList.remove('has-pattern');
    }
  }, [palette, mode, pattern]);

  return (
    <ThemeContext.Provider value={{ palette, setPalette, mode, setMode, pattern, setPattern }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
