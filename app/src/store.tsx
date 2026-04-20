import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AppState, Tool, Kit, InventoryItem, ProductCandidate } from './types';
import { generateSeedTools } from './seedData';
import { generateId } from './logic';

const STORAGE_KEY = 'verktoyplanlegger-state';

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    tools: generateSeedTools(),
    kits: [],
    preferredShops: ['Jula', 'Biltema', 'Clas Ohlson', 'Byggmax'],
  };
}

interface AppContextValue {
  state: AppState;
  updateTool: (id: string, updates: Partial<Tool>) => void;
  addInventoryItem: (toolId: string, item: Omit<InventoryItem, 'id'>) => void;
  removeInventoryItem: (toolId: string, itemId: string) => void;
  addCandidate: (toolId: string, candidate: Omit<ProductCandidate, 'id'>) => void;
  removeCandidate: (toolId: string, candidateId: string) => void;
  chooseCandidate: (toolId: string, index: number | null) => void;
  addKit: (kit: Omit<Kit, 'id'>) => void;
  removeKit: (kitId: string) => void;
  addCustomTool: (name: string, category: string, type: 'basic' | 'advanced') => void;
  resetAll: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const updateTools = (fn: (tools: Tool[]) => Tool[]) => {
    setState((s) => ({ ...s, tools: fn(s.tools) }));
  };

  const mapTool = (id: string, fn: (t: Tool) => Tool) => {
    updateTools((tools) => tools.map((t) => (t.id === id ? fn(t) : t)));
  };

  const value: AppContextValue = {
    state,
    updateTool: (id, updates) => mapTool(id, (t) => ({ ...t, ...updates })),
    addInventoryItem: (toolId, item) =>
      mapTool(toolId, (t) => ({
        ...t,
        inventory: [...t.inventory, { ...item, id: generateId() }],
      })),
    removeInventoryItem: (toolId, itemId) =>
      mapTool(toolId, (t) => ({
        ...t,
        inventory: t.inventory.filter((i) => i.id !== itemId),
      })),
    addCandidate: (toolId, candidate) =>
      mapTool(toolId, (t) => ({
        ...t,
        candidates: [...t.candidates, { ...candidate, id: generateId() }],
      })),
    removeCandidate: (toolId, candidateId) =>
      mapTool(toolId, (t) => ({
        ...t,
        candidates: t.candidates.filter((c) => c.id !== candidateId),
        chosen: t.chosen !== null && t.candidates[t.chosen]?.id === candidateId ? null : t.chosen,
      })),
    chooseCandidate: (toolId, index) => mapTool(toolId, (t) => ({ ...t, chosen: index })),
    addKit: (kit) =>
      setState((s) => ({ ...s, kits: [...s.kits, { ...kit, id: generateId() }] })),
    removeKit: (kitId) =>
      setState((s) => ({ ...s, kits: s.kits.filter((k) => k.id !== kitId) })),
    addCustomTool: (name, category, type) =>
      updateTools((tools) => [
        ...tools,
        {
          id: generateId(),
          name,
          category,
          type,
          inventoryDone: false,
          inventory: [],
          candidates: [],
          chosen: null,
          notes: '',
        },
      ]),
    resetAll: () => {
      const fresh: AppState = {
        tools: generateSeedTools(),
        kits: [],
        preferredShops: ['Jula', 'Biltema', 'Clas Ohlson', 'Byggmax'],
      };
      setState(fresh);
    },
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
