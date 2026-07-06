import React, { createContext, useContext, ReactNode } from 'react';
import { useAppStore } from '../contexts/store';
import { COLORS } from '../constants';

interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  border: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  success: string;
  error: string;
  warning: string;
  info: string;
  white: string;
  black: string;
}

interface ThemeContextType {
  colors: ThemeColors;
  isDark: boolean;
  spacing: (factor: number) => number;
  fontSize: (size: number) => number;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const resolvedTheme = useAppStore((state) => state.resolvedTheme);
  
  const colors = resolvedTheme === 'dark' ? COLORS.dark : COLORS.light;
  const isDark = resolvedTheme === 'dark';
  
  const spacing = (factor: number): number => factor * 4;
  const fontSize = (size: number): number => size;
  
  return (
    <ThemeContext.Provider value={{ colors, isDark, spacing, fontSize }}>
      {children}
    </ThemeContext.Provider>
  );
};