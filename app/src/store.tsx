import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import type { Tool, House } from './types';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { migrateTool, runMigration } from './migration';
import { generateId } from './logic';
import { AuthContext, AppContext, type AppContextValue } from './context';

/** Godkjente konti og hvilket hus de representerer. */
const EMAIL_TO_HOUSE: Record<string, House> = {
  'omar1490@gmail.com': 'raschsvei',
  'ilyas.narvesen@gmail.com': 'osterliveien',
};

const ACCESS_ERROR = 'Kun autoriserte Google-konti har tilgang.';
const avatarsDoc = doc(db, 'meta', 'avatars');

/* ── Auth provider ── */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const avatarWritten = useRef(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      const house = u?.email ? EMAIL_TO_HOUSE[u.email] : undefined;
      if (u && !house) {
        signOut(auth);
        setAuthError(ACCESS_ERROR);
        setUser(null);
      } else {
        setUser(u);
        setAuthError(null);
        // Fang Google-avataren for kontoens hus (én gang per økt).
        if (u && house && u.photoURL && !avatarWritten.current) {
          avatarWritten.current = true;
          setDoc(avatarsDoc, { [house]: u.photoURL }, { merge: true }).catch((e) =>
            console.error('Kunne ikke lagre avatar:', e)
          );
        }
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const signIn = async () => {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (!result.user.email || !EMAIL_TO_HOUSE[result.user.email]) {
        await signOut(auth);
        setAuthError(ACCESS_ERROR);
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
  const [avatars, setAvatars] = useState<Record<House, string | null>>({
    osterliveien: null,
    raschsvei: null,
  });
  const migrationAttempted = useRef(false);

  useEffect(() => {
    const unsub = onSnapshot(toolsCol, (snap) => {
      setTools(snap.docs.map((d) => migrateTool(d.data())));
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(avatarsDoc, (snap) => {
      const data = snap.exists() ? (snap.data() as Partial<Record<House, string>>) : {};
      setAvatars({ osterliveien: data.osterliveien ?? null, raschsvei: data.raschsvei ?? null });
    });
    return unsub;
  }, []);

  // Engangs skrivemigrering til v3 når dataene er lastet.
  useEffect(() => {
    if (loading || migrationAttempted.current) return;
    migrationAttempted.current = true;
    runMigration(tools).catch((e) => {
      console.error('Migrering til v3 feilet:', e);
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
    avatars,
    updateTool: (id, updates) => mapTool(id, (t) => ({ ...t, ...updates })),
    addTool: (name, category, type) => {
      const tool: Tool = {
        id: generateId(),
        name,
        category,
        type,
        instances: [],
        needOverride: { osterliveien: null, raschsvei: null },
        notes: '',
        v: 3,
      };
      setTools((tools) => [...tools, tool]);
      setDoc(doc(toolsCol, tool.id), tool);
    },
    deleteTool: (id) => {
      setTools((tools) => tools.filter((t) => t.id !== id));
      deleteDoc(doc(toolsCol, id));
    },
    mergeTools: (ids, meta) => {
      if (ids.length < 2) return;
      setTools((tools) => {
        const selected = ids
          .map((id) => tools.find((t) => t.id === id))
          .filter((t): t is Tool => !!t);
        if (selected.length < 2) return tools;
        const survivor = selected[0];
        const mergedInstances = selected
          .flatMap((t) => t.instances)
          .map((i) => ({ ...i, id: generateId() }));
        const merged: Tool = {
          ...survivor,
          name: meta.name,
          category: meta.category,
          type: meta.type,
          instances: mergedInstances,
        };
        const removedIds = selected.slice(1).map((t) => t.id);

        const batch = writeBatch(db);
        batch.set(doc(toolsCol, merged.id), merged);
        for (const rid of removedIds) batch.delete(doc(toolsCol, rid));
        batch.commit().catch((e) => console.error('Sammenslåing feilet:', e));

        const removed = new Set(removedIds);
        return tools.map((t) => (t.id === merged.id ? merged : t)).filter((t) => !removed.has(t.id));
      });
    },
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
