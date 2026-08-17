import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Tool, House, NewToolInput, SyncStatus } from './types';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { migrateTool, runMigration } from './migration';
import { generateId } from './logic';
import { AuthContext, AppContext, useAuth, type AppContextValue } from './context';

const EMAIL_TO_HOUSE: Record<string, House> = {
  'omar1490@gmail.com': 'raschsvei',
  'ilyas.narvesen@gmail.com': 'osterliveien',
};

const ACCESS_ERROR = 'Kun Omar og Ilyas kan logge inn og gjøre endringer.';
const avatarsDoc = doc(db, 'meta', 'avatars');

function isAuthorizedUser(user: User | null): boolean {
  return Boolean(user?.email && EMAIL_TO_HOUSE[user.email]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const avatarWritten = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      const house = nextUser?.email ? EMAIL_TO_HOUSE[nextUser.email] : undefined;
      if (nextUser && !house) {
        signOut(auth);
        setAuthError(ACCESS_ERROR);
        setUser(null);
      } else {
        setUser(nextUser);
        setAuthError(null);
        if (nextUser && house && nextUser.photoURL && !avatarWritten.current) {
          avatarWritten.current = true;
          setDoc(avatarsDoc, { [house]: nextUser.photoURL }, { merge: true }).catch((error) =>
            console.error('Kunne ikke lagre avatar:', error)
          );
        }
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async (): Promise<boolean> => {
    setAuthError(null);
    setSigningIn(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (!result.user.email || !EMAIL_TO_HOUSE[result.user.email]) {
        await signOut(auth);
        setAuthError(ACCESS_ERROR);
        return false;
      }
      return true;
    } catch (error: unknown) {
      setAuthError(error instanceof Error ? error.message : 'Innlogging feilet');
      return false;
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signingIn,
        signIn,
        logOut: () => signOut(auth),
        authError,
        currentHouse: user?.email ? EMAIL_TO_HOUSE[user.email] ?? null : null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

const toolsCol = collection(db, 'tools');

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(navigator.onLine ? 'loading' : 'offline');
  const [avatars, setAvatars] = useState<Record<House, string | null>>({
    osterliveien: null,
    raschsvei: null,
  });
  const migrationAttempted = useRef(false);
  const pendingWrites = useRef(0);

  const trackWrite = (operation: Promise<unknown>) => {
    pendingWrites.current += 1;
    setSyncStatus(navigator.onLine ? 'saving' : 'offline');
    operation
      .then(() => {
        pendingWrites.current = Math.max(0, pendingWrites.current - 1);
        setSyncStatus(navigator.onLine ? (pendingWrites.current ? 'saving' : 'saved') : 'offline');
      })
      .catch((error) => {
        pendingWrites.current = Math.max(0, pendingWrites.current - 1);
        setSyncStatus(navigator.onLine ? 'error' : 'offline');
        console.error('Firestore-skriving feilet:', error);
      });
  };

  useEffect(() => {
    const online = () => setSyncStatus(pendingWrites.current ? 'saving' : 'saved');
    const offline = () => setSyncStatus('offline');
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      toolsCol,
      { includeMetadataChanges: true },
      (snapshot) => {
        setTools(snapshot.docs.map((item) => migrateTool(item.data())));
        setLoading(false);
        if (!navigator.onLine || snapshot.metadata.fromCache) setSyncStatus('offline');
        else if (snapshot.metadata.hasPendingWrites || pendingWrites.current) setSyncStatus('saving');
        else setSyncStatus('saved');
      },
      (error) => {
        console.error('Firestore-lytter feilet:', error);
        setLoading(false);
        setSyncStatus('error');
      }
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(avatarsDoc, (snapshot) => {
      const data = snapshot.exists() ? (snapshot.data() as Partial<Record<House, string>>) : {};
      setAvatars({ osterliveien: data.osterliveien ?? null, raschsvei: data.raschsvei ?? null });
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isAuthorizedUser(user) || loading || migrationAttempted.current) return;
    migrationAttempted.current = true;
    runMigration(tools).catch((error) => console.error('Migrering til v5 feilet:', error));
  }, [loading, tools, user]);

  const canWrite = () => isAuthorizedUser(auth.currentUser);

  const updateTool = (id: string, updates: Partial<Tool>): Tool | null => {
    if (!canWrite()) return null;
    const existing = tools.find((tool) => tool.id === id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    setTools((current) => current.map((tool) => (tool.id === id ? updated : tool)));
    trackWrite(setDoc(doc(toolsCol, updated.id), updated));
    return updated;
  };

  const putTool = (tool: Tool) => {
    if (!canWrite()) return;
    setTools((current) => {
      const exists = current.some((item) => item.id === tool.id);
      return exists ? current.map((item) => (item.id === tool.id ? tool : item)) : [...current, tool];
    });
    trackWrite(setDoc(doc(toolsCol, tool.id), tool));
  };

  const addTool = (input: NewToolInput): Tool => {
    if (!canWrite()) throw new Error('Innlogging kreves for å legge til verktøy.');
    const tool: Tool = {
      id: generateId(),
      name: input.name,
      category: input.category,
      type: input.type,
      image: input.image ?? '',
      instances: input.owner
        ? [{ id: generateId(), location: input.owner, image: input.image ?? '', label: '' }]
        : [],
      needOverride: { osterliveien: null, raschsvei: null },
      postponed: { osterliveien: false, raschsvei: false },
      purchaseOptions: [],
      selectedPurchaseOption: { osterliveien: null, raschsvei: null },
      notes: input.notes ?? '',
      v: 5,
    };
    setTools((current) => [...current, tool]);
    trackWrite(setDoc(doc(toolsCol, tool.id), tool));
    return tool;
  };

  const deleteTool = (id: string) => {
    if (!canWrite()) return;
    setTools((current) => current.filter((tool) => tool.id !== id));
    trackWrite(deleteDoc(doc(toolsCol, id)));
  };

  const mergeTools: AppContextValue['mergeTools'] = (ids, meta) => {
    if (!canWrite()) return null;
    if (ids.length < 2) return null;
    const selected = ids
      .map((id) => tools.find((tool) => tool.id === id))
      .filter((tool): tool is Tool => Boolean(tool));
    const survivor = selected.find((tool) => tool.id === meta.survivorId);
    if (!survivor || selected.length < 2) return null;

    const purchaseOptions = [...new Map(
      selected.flatMap((tool) => tool.purchaseOptions).map((option) => [option.canonicalUrl || option.url, option])
    ).values()];
    const selectedOption = (house: House) => {
      const wanted = survivor.selectedPurchaseOption[house]
        ?? selected.find((tool) => tool.selectedPurchaseOption[house])?.selectedPurchaseOption[house]
        ?? null;
      return wanted && purchaseOptions.some((option) => option.id === wanted) ? wanted : null;
    };
    const merged: Tool = {
      ...survivor,
      name: meta.name,
      category: meta.category,
      type: meta.type,
      image: selected.find((tool) => tool.image)?.image ?? '',
      notes: [...new Set(selected.map((tool) => tool.notes.trim()).filter(Boolean))].join('\n\n'),
      instances: selected.flatMap((tool) => tool.instances).map((instance) => ({ ...instance })),
      needOverride: {
        osterliveien:
          survivor.needOverride.osterliveien ??
          selected.find((tool) => tool.needOverride.osterliveien !== null)?.needOverride.osterliveien ??
          null,
        raschsvei:
          survivor.needOverride.raschsvei ??
          selected.find((tool) => tool.needOverride.raschsvei !== null)?.needOverride.raschsvei ??
          null,
      },
      postponed: {
        osterliveien: selected.some((tool) => tool.postponed?.osterliveien),
        raschsvei: selected.some((tool) => tool.postponed?.raschsvei),
      },
      purchaseOptions,
      selectedPurchaseOption: {
        osterliveien: selectedOption('osterliveien'),
        raschsvei: selectedOption('raschsvei'),
      },
    };
    const removedIds = selected.filter((tool) => tool.id !== survivor.id).map((tool) => tool.id);
    const batch = writeBatch(db);
    batch.set(doc(toolsCol, merged.id), merged);
    removedIds.forEach((id) => batch.delete(doc(toolsCol, id)));
    trackWrite(batch.commit());

    const removed = new Set(removedIds);
    setTools((current) =>
      current.map((tool) => (tool.id === merged.id ? merged : tool)).filter((tool) => !removed.has(tool.id))
    );
    return merged;
  };

  const value: AppContextValue = {
    tools,
    loading,
    syncStatus,
    avatars,
    updateTool,
    putTool,
    addTool,
    deleteTool,
    mergeTools,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
