import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { AppState, Tool, Kit, InventoryItem, ProductCandidate } from './types';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { generateSeedTools } from './seedData';
import { generateId } from './logic';

const ALLOWED_EMAIL = 'omar1490@gmail.com';

/* ── Auth context ── */

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
  authError: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u && u.email !== ALLOWED_EMAIL) {
        signOut(auth);
        setAuthError('Kun omar1490@gmail.com har tilgang.');
        setUser(null);
      } else {
        setUser(u);
        setAuthError(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const signIn = async () => {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user.email !== ALLOWED_EMAIL) {
        await signOut(auth);
        setAuthError('Kun omar1490@gmail.com har tilgang.');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Innlogging feilet';
      setAuthError(msg);
    }
  };

  const logOut = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, logOut, authError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

/* ── App data context (Firestore-backed, global shared data) ── */

interface AppContextValue {
  state: AppState;
  loading: boolean;
  updateTool: (id: string, updates: Partial<Tool>) => void;
  addInventoryItem: (toolId: string, item: Omit<InventoryItem, 'id'>) => void;
  updateInventoryItem: (toolId: string, itemId: string, updates: Partial<InventoryItem>) => void;
  removeInventoryItem: (toolId: string, itemId: string) => void;
  addCandidate: (toolId: string, candidate: Omit<ProductCandidate, 'id'>) => void;
  updateCandidate: (toolId: string, candidateId: string, updates: Partial<ProductCandidate>) => void;
  removeCandidate: (toolId: string, candidateId: string) => void;
  chooseCandidate: (toolId: string, index: number | null) => void;
  addKit: (kit: Omit<Kit, 'id'>) => void;
  updateKit: (kitId: string, updates: Partial<Kit>) => void;
  removeKit: (kitId: string) => void;
  addCustomTool: (name: string, category: string, type: 'basic' | 'advanced') => void;
  addShop: (shop: string) => void;
  resetAll: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const toolsCol = collection(db, 'tools');
const kitsCol = collection(db, 'kits');
const prefsDoc = doc(db, 'meta', 'prefs');

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({ tools: [], kits: [], preferredShops: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let toolsLoaded = false;
    let kitsLoaded = false;
    let metaLoaded = false;
    const checkDone = () => {
      if (toolsLoaded && kitsLoaded && metaLoaded) setLoading(false);
    };

    const unsubTools = onSnapshot(toolsCol, (snap) => {
      const tools = snap.docs.map((d) => d.data() as Tool);
      setState((s) => ({ ...s, tools }));
      toolsLoaded = true;
      checkDone();
    });

    const unsubKits = onSnapshot(kitsCol, (snap) => {
      const kits = snap.docs.map((d) => d.data() as Kit);
      setState((s) => ({ ...s, kits }));
      kitsLoaded = true;
      checkDone();
    });

    const unsubMeta = onSnapshot(prefsDoc, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as { preferredShops?: string[] };
        setState((s) => ({ ...s, preferredShops: data.preferredShops ?? [] }));
      }
      metaLoaded = true;
      checkDone();
    });

    return () => {
      unsubTools();
      unsubKits();
      unsubMeta();
    };
  }, []);

  const mapTool = useCallback((id: string, fn: (t: Tool) => Tool) => {
    setState((s) => {
      const newTools = s.tools.map((t) => {
        if (t.id !== id) return t;
        const updated = fn(t);
        setDoc(doc(toolsCol, updated.id), updated);
        return updated;
      });
      return { ...s, tools: newTools };
    });
  }, []);

  const value: AppContextValue = {
    state,
    loading,
    updateTool: (id, updates) => mapTool(id, (t) => ({ ...t, ...updates })),
    addInventoryItem: (toolId, item) =>
      mapTool(toolId, (t) => ({
        ...t,
        inventory: [...t.inventory, { ...item, id: generateId() }],
      })),
    updateInventoryItem: (toolId, itemId, updates) =>
      mapTool(toolId, (t) => ({
        ...t,
        inventory: t.inventory.map((i) => (i.id === itemId ? { ...i, ...updates } : i)),
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
    updateCandidate: (toolId, candidateId, updates) =>
      mapTool(toolId, (t) => ({
        ...t,
        candidates: t.candidates.map((c) => (c.id === candidateId ? { ...c, ...updates } : c)),
      })),
    removeCandidate: (toolId, candidateId) =>
      mapTool(toolId, (t) => ({
        ...t,
        candidates: t.candidates.filter((c) => c.id !== candidateId),
        chosen:
          t.chosen !== null && t.candidates[t.chosen]?.id === candidateId ? null : t.chosen,
      })),
    chooseCandidate: (toolId, index) => mapTool(toolId, (t) => ({ ...t, chosen: index })),
    addKit: (kit) => {
      const full: Kit = { ...kit, id: generateId() };
      setState((s) => ({ ...s, kits: [...s.kits, full] }));
      setDoc(doc(kitsCol, full.id), full);
    },
    updateKit: (kitId, updates) => {
      setState((s) => ({
        ...s,
        kits: s.kits.map((k) => {
          if (k.id !== kitId) return k;
          const updated = { ...k, ...updates };
          setDoc(doc(kitsCol, updated.id), updated);
          return updated;
        }),
      }));
    },
    removeKit: (kitId) => {
      setState((s) => ({ ...s, kits: s.kits.filter((k) => k.id !== kitId) }));
      deleteDoc(doc(kitsCol, kitId));
    },
    addCustomTool: (name, category, type) => {
      const tool: Tool = {
        id: generateId(),
        name,
        category,
        type,
        inventoryDone: false,
        inventory: [],
        candidates: [],
        chosen: null,
        notes: '',
      };
      setState((s) => ({ ...s, tools: [...s.tools, tool] }));
      setDoc(doc(toolsCol, tool.id), tool);
    },
    addShop: (shop: string) => {
      setState((s) => {
        const shops = [...s.preferredShops, shop];
        setDoc(prefsDoc, { preferredShops: shops });
        return { ...s, preferredShops: shops };
      });
    },
    resetAll: async () => {
      const batch = writeBatch(db);
      state.tools.forEach((t) => batch.delete(doc(toolsCol, t.id)));
      state.kits.forEach((k) => batch.delete(doc(kitsCol, k.id)));
      await batch.commit();

      const seedTools = generateSeedTools();
      const batch2 = writeBatch(db);
      seedTools.forEach((t) => batch2.set(doc(toolsCol, t.id), t));
      batch2.set(prefsDoc, {
        preferredShops: ['Jula', 'Biltema', 'Clas Ohlson', 'Byggmax', 'Obs Bygg'],
      });
      await batch2.commit();
    },
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
