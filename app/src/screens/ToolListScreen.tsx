import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp, useAuth } from '../context';
import {
  CATEGORY_ORDER,
} from '../categories';
import {
  HOUSES,
  effectiveNeed,
  findDuplicates,
  generateId,
  houseLabel,
  housePerson,
  matchesIntent,
  shoppingListText,
  toolMatchesSearch,
  type ViewIntent,
} from '../logic';
import type { Tool, House } from '../types';
import { ToolCard } from '../components/ToolCard';
import { FilterBar } from '../components/FilterBar';
import { EditToolSheet } from '../components/EditToolSheet';
import { AddToolModal } from '../components/AddToolModal';
import { MergeDialog } from '../components/MergeDialog';
import { HouseBadge } from '../components/HouseBadge';
import { ToolGlyph } from '../components/ToolImage';

const VIEW_KEY = 'verktoyplanlegger:view:v2';

function readView(): { intent: ViewIntent; houses: House[]; collapsed: string[] } {
  try {
    const saved = JSON.parse(localStorage.getItem(VIEW_KEY) ?? '{}');
    return {
      intent: ['alle', 'handleliste', 'har'].includes(saved.intent) ? saved.intent : 'alle',
      houses: Array.isArray(saved.houses) ? saved.houses.filter((house: string) => HOUSES.includes(house as House)) : [],
      collapsed: Array.isArray(saved.collapsed) ? saved.collapsed : [],
    };
  } catch {
    return { intent: 'alle', houses: [], collapsed: [] };
  }
}

interface Notice {
  message: string;
  undo?: () => void;
}

export function ToolListScreen() {
  const { tools, loading, updateTool, putTool, deleteTool, mergeTools } = useApp();
  const { logOut, currentHouse: authHouse } = useAuth();
  const currentHouse = authHouse ?? 'raschsvei';
  const initial = useMemo(() => readView(), []);
  const [intent, setIntent] = useState<ViewIntent>(initial.intent);
  const [houses, setHouses] = useState<House[]>(initial.houses);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(initial.collapsed));
  const [showAddTool, setShowAddTool] = useState(false);
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showMerge, setShowMerge] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const noticeTimer = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem(VIEW_KEY, JSON.stringify({ intent, houses, collapsed: [...collapsed] }));
  }, [intent, houses, collapsed]);

  useEffect(() => () => {
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
  }, []);

  const notify = (message: string, undo?: () => void) => {
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    setNotice({ message, undo });
    noticeTimer.current = window.setTimeout(() => setNotice(null), 6500);
  };

  const allCategories = useMemo(() => {
    const categories = new Set(CATEGORY_ORDER);
    tools.forEach((tool) => categories.add(tool.category));
    return [...categories];
  }, [tools]);

  const filtered = useMemo(
    () => tools.filter((tool) => matchesIntent(tool, intent, houses) && toolMatchesSearch(tool, search)),
    [tools, intent, houses, search]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Tool[]>();
    filtered.forEach((tool) => map.set(tool.category, [...(map.get(tool.category) ?? []), tool]));
    return allCategories.filter((category) => map.has(category)).map((category) => [category, map.get(category)!] as const);
  }, [filtered, allCategories]);

  const selectedTool = selectedToolId ? tools.find((tool) => tool.id === selectedToolId) ?? null : null;
  const selectedTools = tools.filter((tool) => selectedIds.has(tool.id));

  const duplicatePair = useMemo(() => {
    for (const tool of tools) {
      const match = findDuplicates(tool.name, tools, tool.id)[0];
      if (match?.score >= 0.88 && tool.id < match.tool.id) return [tool, match.tool] as const;
    }
    return null;
  }, [tools]);

  const setViewIntent = (next: ViewIntent) => {
    setIntent(next);
    if (next === 'handleliste' && houses.length === 0) setHouses([currentHouse]);
  };

  const toggleSelected = (tool: Tool) => {
    if (!selectMode) {
      setSelectedToolId(tool.id);
      return;
    }
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(tool.id)) next.delete(tool.id);
      else next.add(tool.id);
      return next;
    });
  };

  const enterSelectMode = (tool?: Tool) => {
    setSelectMode(true);
    setProfileOpen(false);
    if (tool) setSelectedIds(new Set([tool.id]));
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
    setShowMerge(false);
  };

  const markPurchased = (tool: Tool) => {
    const scope = houses.length ? houses : [currentHouse];
    const destination = scope.find((house) => effectiveNeed(tool, house) > 0) ?? HOUSES.find((house) => effectiveNeed(tool, house) > 0);
    if (!destination) return;
    const before = structuredClone(tool);
    const override = tool.needOverride[destination];
    updateTool(tool.id, {
      instances: [...tool.instances, { id: generateId(), location: destination, image: tool.image, label: 'Nyinnkjøpt' }],
      needOverride: {
        ...tool.needOverride,
        [destination]: typeof override === 'number' && override > 0 ? Math.max(0, override - 1) : override,
      },
    });
    notify(`${tool.name} er lagt til hos ${houseLabel(destination)}`, () => putTool(before));
  };

  const shareList = async () => {
    const text = shoppingListText(tools, houses);
    try {
      if (navigator.share) await navigator.share({ title: 'Handleliste – Verktøyplanlegger', text });
      else {
        await navigator.clipboard.writeText(text);
        notify('Handlelisten er kopiert');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      notify('Kunne ikke dele handlelisten');
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand"><p>Delt verktøyliste</p><h1>Verktøyplanlegger</h1></div>
          <button className="profile-button" onClick={() => setProfileOpen((value) => !value)} aria-expanded={profileOpen} aria-label="Åpne profilmeny"><HouseBadge house={currentHouse} size={38} /></button>
          {profileOpen && (
            <div className="profile-menu">
              <div className="profile-summary"><HouseBadge house={currentHouse} size={34} /><span><strong>{housePerson(currentHouse)}</strong><small>{houseLabel(currentHouse)}</small></span></div>
              <button onClick={() => enterSelectMode()}>Slå sammen duplikater</button>
              <button onClick={logOut}>Logg ut</button>
            </div>
          )}
        </div>
      </header>

      <main className="workspace" id="main">
        <section className="control-panel" aria-label="Søk og filtrering">
          <div className="search-wrap">
            <span aria-hidden="true">⌕</span>
            <label className="sr-only" htmlFor="tool-search">Søk i verktøy</label>
            <input id="tool-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Søk etter verktøy, kategori eller notat…" />
            {search && <button onClick={() => setSearch('')} aria-label="Tøm søk">×</button>}
          </div>
          <FilterBar intent={intent} houses={houses} onIntentChange={setViewIntent} onHousesChange={setHouses} />
          <div className="result-meta"><span>{filtered.length} av {tools.length} verktøy</span>{intent === 'handleliste' && filtered.length > 0 && <button className="text-button" onClick={shareList}>↥ Del handlelisten</button>}</div>
        </section>

        {loading ? (
          <div className="skeleton-grid" aria-label="Laster verktøy">{Array.from({ length: 8 }, (_, index) => <div className="skeleton" key={index} />)}</div>
        ) : (
          <>
            {duplicatePair && !selectMode && (
              <aside className="duplicate-banner"><span>◇</span><span><strong>Disse ligner på hverandre</strong>{duplicatePair[0].name} og {duplicatePair[1].name}</span><button onClick={() => { setSelectedIds(new Set(duplicatePair.map((tool) => tool.id))); setSelectMode(true); setShowMerge(true); }}>Slå sammen</button></aside>
            )}
            {grouped.map(([category, categoryTools]) => {
              const isCollapsed = collapsed.has(category);
              return (
                <section className="category-section" id={`category-${encodeURIComponent(category)}`} key={category}>
                  <div className="category-heading">
                    <button
                      className="collapse-button"
                      aria-expanded={!isCollapsed}
                      aria-label={`${isCollapsed ? 'Vis' : 'Skjul'} ${category}`}
                      onClick={() => setCollapsed((current) => { const next = new Set(current); if (next.has(category)) next.delete(category); else next.add(category); return next; })}
                    >⌄</button>
                    <h2>{category}</h2>
                  </div>
                  {!isCollapsed && <div className="tool-grid">{categoryTools.map((tool) => (
                    <ToolCard
                      key={tool.id}
                      tool={tool}
                      selectedHouses={houses}
                      shopping={intent === 'handleliste'}
                      selectMode={selectMode}
                      selected={selectedIds.has(tool.id)}
                      onClick={() => toggleSelected(tool)}
                      onLongPress={() => enterSelectMode(tool)}
                      onPurchased={() => markPurchased(tool)}
                    />
                  ))}</div>}
                </section>
              );
            })}
            {grouped.length === 0 && (
              <section className="empty-state"><div><ToolGlyph /></div><h2>{search ? `Ingen treff på «${search}»` : intent === 'handleliste' ? `Handlelisten er tom${houses.length === 1 ? ` for ${housePerson(houses[0])}` : ''}` : 'Ingen verktøy i denne visningen'}</h2><p>{search ? 'Prøv et annet navn, eller tøm søket.' : 'Bytt filter for å se resten av verktøyene.'}</p><button className="secondary-button" onClick={() => { setSearch(''); setIntent('alle'); setHouses([]); }}>Vis alle verktøy</button></section>
            )}
          </>
        )}
      </main>

      {!selectMode ? <button className="add-tool-fab" onClick={() => setShowAddTool(true)}><span>+</span><b>Legg til</b></button> : (
        <div className="selection-bar"><strong>{selectedIds.size} valgt</strong><button onClick={exitSelectMode}>Avslutt</button><button className="primary-button" disabled={selectedIds.size < 2} onClick={() => setShowMerge(true)}>Slå sammen</button></div>
      )}

      <AddToolModal
        open={showAddTool}
        categories={allCategories}
        currentHouse={currentHouse}
        onClose={() => setShowAddTool(false)}
        onAdded={(tool) => { setShowAddTool(false); setSelectedToolId(tool.id); notify(`${tool.name} er lagt til`, () => deleteTool(tool.id)); }}
        onOpenExisting={(tool) => { setShowAddTool(false); setSelectedToolId(tool.id); notify('Verktøyet finnes allerede – åpnet eksisterende kort'); }}
      />

      {showMerge && selectedTools.length > 1 && (
        <MergeDialog
          key={[...selectedIds].join('-')}
          open
          tools={selectedTools}
          categories={allCategories}
          onClose={() => setShowMerge(false)}
          onConfirm={(meta) => {
            const originals = selectedTools.map((tool) => structuredClone(tool));
            const merged = mergeTools([...selectedIds], meta);
            if (!merged) return;
            setShowMerge(false);
            exitSelectMode();
            setSelectedToolId(merged.id);
            notify(`${originals.length} verktøy er slått sammen`, () => originals.forEach(putTool));
          }}
        />
      )}

      {selectedTool && <EditToolSheet key={selectedTool.id} tool={selectedTool} categories={allCategories} currentHouse={currentHouse} onClose={() => setSelectedToolId(null)} notify={notify} />}

      {notice && <div className="snackbar" role="status"><span>{notice.message}</span>{notice.undo && <button onClick={() => { notice.undo?.(); setNotice(null); }}>Angre</button>}<button aria-label="Lukk melding" onClick={() => setNotice(null)}>×</button></div>}
    </div>
  );
}
