// Kun for utvikling: ?preview rendrer appen med eksempeldata i minnet i
// stedet for Firestore, slik at layouten kan sjekkes uten innlogging.
import { useState, type ReactNode } from 'react';
import { AppContext, type AppContextValue } from './context';
import { AuthProvider } from './store';
import { ToolListScreen } from './screens/ToolListScreen';
import type { Tool, ToolType } from './types';
import { generateId } from './logic';

function svgThumb(label: string, bg: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="${bg}"/><text x="100" y="110" font-family="sans-serif" font-size="28" fill="#fff" text-anchor="middle">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function sample(partial: Partial<Tool> & Pick<Tool, 'name' | 'category'>): Tool {
  return {
    id: generateId(),
    type: 'basis',
    counts: { osterliveien: 0, raschsvei: 0 },
    needOverride: { osterliveien: null, raschsvei: null },
    images: [],
    notes: '',
    v: 2,
    ...partial,
  };
}

const SAMPLE_TOOLS: Tool[] = [
  sample({ name: 'Hammer', category: 'Slagverktøy', counts: { osterliveien: 1, raschsvei: 1 }, images: [svgThumb('Hammer', '#8e6e53')] }),
  sample({ name: 'Skiftenøkkel', category: 'Nøkler', counts: { osterliveien: 2, raschsvei: 1 }, images: [svgThumb('Nøkkel 1', '#456990'), svgThumb('Nøkkel 2', '#028090'), svgThumb('Nøkkel 3', '#114b5f')] }),
  sample({ name: 'Momentnøkkel', category: 'Nøkler', type: 'avansert', counts: { osterliveien: 0, raschsvei: 0 }, images: [svgThumb('Moment', '#6b4e71')] }),
  sample({ name: 'Laservater', category: 'Måleverktøy', type: 'avansert', counts: { osterliveien: 0, raschsvei: 1 }, images: [svgThumb('Laser', '#c05746')] }),
  sample({ name: 'Tommestokk', category: 'Måleverktøy', counts: { osterliveien: 1, raschsvei: 0 }, images: [svgThumb('Tommestokk', '#f18f01')] }),
  sample({ name: 'Målebånd', category: 'Måleverktøy', counts: { osterliveien: 0, raschsvei: 0 } }),
  sample({ name: 'Universaltang', category: 'Tenger', counts: { osterliveien: 0, raschsvei: 2 }, needOverride: { osterliveien: 2, raschsvei: null }, images: [svgThumb('Tang 1', '#2f6690'), svgThumb('Tang 2', '#3a7ca5')] }),
  sample({ name: 'Nebbtang', category: 'Tenger', counts: { osterliveien: 1, raschsvei: 1 }, images: [svgThumb('Nebbtang', '#16425b')] }),
  sample({ name: 'Håndsag', category: 'Skjæreverktøy', counts: { osterliveien: 0, raschsvei: 0 }, needOverride: { osterliveien: null, raschsvei: 0 }, images: [svgThumb('Sag', '#5b8e7d')] }),
  sample({ name: 'Hodelykt', category: 'Arbeidslys', counts: { osterliveien: 1, raschsvei: 0 }, images: [svgThumb('Lykt', '#bc4749')] }),
];

function PreviewAppProvider({ children }: { children: ReactNode }) {
  const [tools, setTools] = useState<Tool[]>(SAMPLE_TOOLS);

  const value: AppContextValue = {
    tools,
    loading: false,
    updateTool: (id, updates) => setTools((ts) => ts.map((t) => (t.id === id ? { ...t, ...updates } : t))),
    addTool: (name: string, category: string, type: ToolType) =>
      setTools((ts) => [...ts, sample({ name, category, type })]),
    deleteTool: (id) => setTools((ts) => ts.filter((t) => t.id !== id)),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export default function PreviewApp() {
  return (
    <AuthProvider>
      <PreviewAppProvider>
        <ToolListScreen />
      </PreviewAppProvider>
    </AuthProvider>
  );
}
