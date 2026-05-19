import { createContext, useContext } from 'react';

export type FamilyMember = {
  id?: string;
  userId?: string;
  role?: string;
};

export type FamilyChild = {
  id?: string;
  name?: string;
  birthday?: string | Date | null;
  isUnborn?: boolean | null;
};

export type Family = {
  id: string;
  name: string;
  modules?: Record<string, boolean> | null;
  members?: FamilyMember[];
  children?: FamilyChild[];
  _count?: {
    members?: number;
    children?: number;
  };
};

export type AppContextValue = {
  families: Family[];
  activeFamilyId: string | null;
  activeFamily?: Family;
  setActiveFamilyId: (id: string) => void;
  refreshFamilies: () => Promise<void>;
  loadingFamilies: boolean;
};

export const AppContext = createContext<AppContextValue | null>(null);

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be used within AppContext provider');
  }
  return ctx;
};
