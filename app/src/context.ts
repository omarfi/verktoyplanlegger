import { createContext, useContext } from 'react';
import type { User } from 'firebase/auth';
import type { Tool, ToolType } from './types';

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
  authError: string | null;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

export interface AppContextValue {
  tools: Tool[];
  loading: boolean;
  updateTool: (id: string, updates: Partial<Tool>) => void;
  addTool: (name: string, category: string, type: ToolType) => void;
  deleteTool: (id: string) => void;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
