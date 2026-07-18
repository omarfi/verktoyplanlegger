// Kun for utvikling: ?preview rendrer appen med eksempeldata i minnet i
// stedet for Firestore, slik at layouten kan sjekkes uten innlogging.
import { useState, type ReactNode } from 'react';
import { AppContext, type AppContextValue } from './context';
import { AuthProvider } from './store';
import { ToolListScreen } from './screens/ToolListScreen';
import type { Tool, ToolInstance, House, NewToolInput } from './types';
import { generateId } from './logic';

function svgThumb(label: string, bg: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="${bg}"/><text x="100" y="110" font-family="sans-serif" font-size="24" fill="#fff" text-anchor="middle">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function avatar(letter: string, bg: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="${bg}"/><text x="40" y="52" font-family="sans-serif" font-size="40" font-weight="bold" fill="#fff" text-anchor="middle">${letter}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function inst(location: House, image = '', label = '', moveTo: House | null = null): ToolInstance {
  return { id: generateId(), location, image, label, moveTo };
}

function sample(partial: Partial<Tool> & Pick<Tool, 'name' | 'category'>): Tool {
  return {
    id: generateId(),
    type: 'basis',
    image: '',
    instances: [],
    needOverride: { osterliveien: null, raschsvei: null },
    notes: '',
    v: 4,
    ...partial,
  };
}

const SAMPLE_TOOLS: Tool[] = [
  sample({ name: 'Hammer', category: 'Slagverktøy', instances: [inst('osterliveien', svgThumb('Hammer', '#8e6e53')), inst('raschsvei', svgThumb('Hammer', '#8e6e53'))] }),
  sample({ name: 'Skiftenøkkel', category: 'Nøkler', instances: [inst('osterliveien', svgThumb('Cocraft', '#456990'), 'Cocraft'), inst('osterliveien', svgThumb('Bahco', '#028090'), 'Bahco'), inst('raschsvei', svgThumb('Bahco', '#114b5f'), 'Bahco')] }),
  // Generell thumbnail, men ingen eksemplarer disponert noe sted.
  sample({ name: 'Momentnøkkel', category: 'Nøkler', type: 'avansert', image: svgThumb('Moment', '#6b4e71'), instances: [] }),
  sample({ name: 'Laservater', category: 'Måleverktøy', type: 'avansert', instances: [inst('raschsvei', svgThumb('Laser', '#c05746'))] }),
  sample({ name: 'Tommestokk', category: 'Måleverktøy', instances: [inst('osterliveien', svgThumb('Tommestokk', '#f18f01'), '', 'raschsvei')] }),
  sample({ name: 'Målebånd IKEA', category: 'Måleverktøy', image: svgThumb('Generell', '#738290'), instances: [inst('raschsvei', svgThumb('IKEA', '#f6a21e'))] }),
  sample({ name: 'Målebånd 8m', category: 'Måleverktøy', instances: [inst('osterliveien', svgThumb('Probuilder', '#e08e0b'))] }),
  sample({ name: 'Universaltang', category: 'Tenger', needOverride: { osterliveien: 2, raschsvei: null }, instances: [inst('raschsvei', svgThumb('Tang 1', '#2f6690')), inst('raschsvei', svgThumb('Tang 2', '#3a7ca5'))] }),
  sample({ name: 'Håndsag', category: 'Skjæreverktøy', needOverride: { osterliveien: null, raschsvei: 0 }, instances: [inst('osterliveien', svgThumb('Sag', '#5b8e7d'))] }),
  sample({ name: 'Hodelykt', category: 'Arbeidslys', instances: [inst('osterliveien', svgThumb('Lykt', '#bc4749'))] }),
];

function PreviewAppProvider({ children }: { children: ReactNode }) {
  const [tools, setTools] = useState<Tool[]>(SAMPLE_TOOLS);

  const value: AppContextValue = {
    tools,
    loading: false,
    syncStatus: 'saved',
    avatars: { osterliveien: avatar('P', '#b45309'), raschsvei: avatar('O', '#0e7490') },
    updateTool: (id, updates) => {
      const existing = tools.find((tool) => tool.id === id);
      if (!existing) return null;
      const updated = { ...existing, ...updates };
      setTools((current) => current.map((tool) => tool.id === id ? updated : tool));
      return updated;
    },
    putTool: (tool) => setTools((current) => current.some((item) => item.id === tool.id) ? current.map((item) => item.id === tool.id ? tool : item) : [...current, tool]),
    addTool: (input: NewToolInput) => {
      const tool = sample({
        name: input.name,
        category: input.category,
        type: input.type,
        image: input.image ?? '',
        notes: input.notes ?? '',
        instances: input.owner ? [inst(input.owner, input.image ?? '')] : [],
      });
      setTools((current) => [...current, tool]);
      return tool;
    },
    deleteTool: (id) => setTools((ts) => ts.filter((t) => t.id !== id)),
    mergeTools: (ids, meta) => {
      const selected = ids.map((id) => tools.find((tool) => tool.id === id)).filter((tool): tool is Tool => Boolean(tool));
      const survivor = selected.find((tool) => tool.id === meta.survivorId);
      if (!survivor || selected.length < 2) return null;
      const merged: Tool = {
        ...survivor,
        name: meta.name,
        category: meta.category,
        type: meta.type,
        image: selected.find((tool) => tool.image)?.image ?? '',
        notes: [...new Set(selected.map((tool) => tool.notes).filter(Boolean))].join('\n\n'),
        instances: selected.flatMap((tool) => tool.instances),
      };
      const removed = new Set(selected.filter((tool) => tool.id !== survivor.id).map((tool) => tool.id));
      setTools((current) => current.map((tool) => tool.id === merged.id ? merged : tool).filter((tool) => !removed.has(tool.id)));
      return merged;
    },
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
