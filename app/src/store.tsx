import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import type { Tool } from './types';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { migrateTool, runMigration } from './migration';
import { generateId } from './logic';
import { AuthContext, AppContext, type AppContextValue } from './context';

const ALLOWED_EMAIL = 'omar1490@gmail.com';

/* ── Auth provider ── */

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

/* ── App data provider (Firestore-backed, global shared data) ── */

const toolsCol = collection(db, 'tools');

export function AppProvider({ children }: { children: ReactNode }) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const migrationAttempted = useRef(false);

  useEffect(() => {
    const unsub = onSnapshot(toolsCol, (snap) => {
      setTools(snap.docs.map((d) => migrateTool(d.data())));
      setLoading(false);
    });
    return unsub;
  }, []);

  // Engangs skrivemigrering til v2 når dataene er lastet.
  useEffect(() => {
    if (loading || migrationAttempted.current) return;
    migrationAttempted.current = true;
    runMigration(tools).catch((e) => {
      console.error('Migrering til v2 feilet:', e);
    });
  }, [loading, tools]);

  const mapTool = useCallback((id: string, fn: (t: Tool) => Tool) => {
    setTools((tools) =>
      tools.map((t) => {
        if (t.id !== id) return t;
        const updated = fn(t);
        setDoc(doc(toolsCol, updated.id), updated);
        return updated;
      })
    );
  }, []);

  const value: AppContextValue = {
    tools,
    loading,
    updateTool: (id, updates) => mapTool(id, (t) => ({ ...t, ...updates })),
    addTool: (name, category, type) => {
      const tool: Tool = {
        id: generateId(),
        name,
        category,
        type,
        counts: { osterliveien: 0, raschsvei: 0 },
        needOverride: { osterliveien: null, raschsvei: null },
        images: [],
        notes: '',
        v: 2,
      };
      setTools((tools) => [...tools, tool]);
      setDoc(doc(toolsCol, tool.id), tool);
    },
    deleteTool: (id) => {
      setTools((tools) => tools.filter((t) => t.id !== id));
      deleteDoc(doc(toolsCol, id));
    },
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
