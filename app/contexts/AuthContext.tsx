import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useAppStore } from '../contexts/store';
import * as supabaseService from '../services/supabase';
import type { Profile } from '../types/supabase';

interface AuthContextType {
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { user, setUser, isLoading, setLoading, setAuthenticated, setCategories } = useAppStore();

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const currentUser = await supabaseService.getCurrentUser();
      
      if (currentUser) {
        const profile = await supabaseService.fetchProfile(currentUser.id);
        setUser(profile);
        setAuthenticated(true);
        
        // Load categories
        const categories = await supabaseService.fetchCategories();
        if (categories && categories.length > 0) {
          setCategories(categories);
          useAppStore.getState().setSelectedCategoryId(categories[0].id);
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const data = await supabaseService.signIn(email, password);
    if (data.user) {
      const profile = await supabaseService.fetchProfile(data.user.id);
      setUser(profile);
      setAuthenticated(true);
      
      // Load categories
      const categories = await supabaseService.fetchCategories();
      if (categories && categories.length > 0) {
        setCategories(categories);
        useAppStore.getState().setSelectedCategoryId(categories[0].id);
      }
    }
  };

  const signUp = async (email: string, password: string) => {
    const data = await supabaseService.signUp(email, password);
    if (data.user) {
      // Profile will be created via trigger
      const profile = await supabaseService.fetchProfile(data.user.id);
      setUser(profile);
      setAuthenticated(true);
    }
  };

  const signOut = async () => {
    await supabaseService.signOut();
    setUser(null);
    setAuthenticated(false);
    useAppStore.getState().reset();
  };

  const refreshProfile = async () => {
    if (user) {
      const profile = await supabaseService.fetchProfile(user.id);
      setUser(profile);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        profile: user,
        isLoading,
        isAuthenticated: !!user,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};