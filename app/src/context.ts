import { createContext, useContext } from 'react';
import type { User } from 'firebase/auth';
import type { Tool, ToolType, House, NewToolInput, SyncStatus } from './types';

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<boolean>;
  logOut: () => Promise<void>;
  authError: string | null;
  signingIn: boolean;
  currentHouse: House | null;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

export interface MergeMeta {
  survivorId: string;
  name: string;
  category: string;
  type: ToolType;
}

export interface AppContextValue {
  tools: Tool[];
  loading: boolean;
  syncStatus: SyncStatus;
  avatars: Record<House, string | null>;
  updateTool: (id: string, updates: Partial<Tool>) => Tool | null;
  putTool: (tool: Tool) => void;
  addTool: (input: NewToolInput) => Tool;
  deleteTool: (id: string) => void;
  mergeTools: (ids: string[], meta: MergeMeta) => Tool | null;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
