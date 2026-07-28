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
  matchesShoppingFilter,
  pendingMoveCount,
  purchaseNeed,
  shoppingListText,
  shoppingSummary,
  toolMatchesSearch,
  type ShoppingFilter,
  type ViewIntent,
} from '../logic';
import type { Tool, House } from '../types';
import { ToolCard } from '../components/ToolCard';
import { FilterBar } from '../components/FilterBar';
import { ShoppingFilterBar } from '../components/ShoppingFilterBar';
import { ShoppingListTable, type ShoppingGroup } from '../components/ShoppingListTable';
import { EditToolSheet } from '../components/EditToolSheet';
import { AddToolModal } from '../components/AddToolModal';
import { MergeDialog } from '../components/MergeDialog';
import { HouseBadge } from '../components/HouseBadge';
import { ToolGlyph } from '../components/ToolImage';
import { InstanceDetailsDialog } from '../components/InstanceDetailsDialog';
import { HouseActionDialog } from '../components/HouseActionDialog';
import { runRaschsveiImport } from '../raschsveiImport';

const VIEW_KEY = 'verktoyplanlegger:view:v2';

function readView(): { intent: ViewIntent; houses: House[]; collapsed: string[]; shoppingFilter: ShoppingFilter } {
  try {
    const saved = JSON.parse(localStorage.getItem(VIEW_KEY) ?? '{}');
    return {
      intent: ['alle', 'handleliste', 'har'].includes(saved.intent) ? saved.intent : 'alle',
      houses: Array.isArray(saved.houses) ? saved.houses.filter((house: string) => HOUSES.includes(house as House)) : [],
      collapsed: Array.isArray(saved.collapsed) ? saved.collapsed : [],
      shoppingFilter: ['alle', 'kjop', 'flytt', 'senere'].includes(saved.shoppingFilter) ? saved.shoppingFilter : 'alle',
    };
  } catch {
    return { intent: 'alle', houses: [], collapsed: [], shoppingFilter: 'alle' };
  }
}

interface Notice {
  message: string;
  undo?: () => void;
}

interface PendingAcquisition {
  toolId: string;
  fixedHouse: House | null;
  houseOptions: House[];
}

export function ToolListScreen() {
  const { tools, loading, updateTool, putTool, deleteTool, mergeTools } = useApp();
  const { user, logOut, signIn, signingIn, authError, currentHouse: authHouse } = useAuth();
  const currentHouse = authHouse ?? 'raschsvei';
  const canWrite = Boolean(user && authHouse);
  const initial = useMemo(() => readView(), []);
  const [intent, setIntent] = useState<ViewIntent>(initial.intent);
  const [houses, setHouses] = useState<House[]>(initial.houses);
  const [shoppingFilter, setShoppingFilter] = useState<ShoppingFilter>(initial.shoppingFilter);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(initial.collapsed));
  const [showAddTool, setShowAddTool] = useState(false);
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showMerge, setShowMerge] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pendingAcquisition, setPendingAcquisition] = useState<PendingAcquisition | null>(null);
  const [pendingMoveToolId, setPendingMoveToolId] = useState<string | null>(null);
  const noticeTimer = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem(VIEW_KEY, JSON.stringify({ intent, houses, collapsed: [...collapsed], shoppingFilter }));
  }, [intent, houses, collapsed, shoppingFilter]);

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

  // Handlelisten som tabell: oppsummer hvert verktøy og del inn i kjøp/flytt/senere.
  const shoppingSummaries = useMemo(
    () => filtered.map((tool) => ({ tool, summary: shoppingSummary(tool, houses) })),
    [filtered, houses]
  );

  const shoppingCounts = useMemo(() => {
    const counts: Record<ShoppingFilter, number> = { alle: 0, kjop: 0, flytt: 0, senere: 0 };
    shoppingSummaries.forEach(({ summary }) => {
      (['alle', 'kjop', 'flytt', 'senere'] as ShoppingFilter[]).forEach((key) => {
        if (matchesShoppingFilter(summary, key)) counts[key] += 1;
      });
    });
    return counts;
  }, [shoppingSummaries]);

  const shoppingGroups = useMemo<ShoppingGroup[]>(() => {
    const map = new Map<string, ShoppingGroup['rows']>();
    shoppingSummaries
      .filter(({ summary }) => matchesShoppingFilter(summary, shoppingFilter))
      .forEach((row) => map.set(row.tool.category, [...(map.get(row.tool.category) ?? []), row]));
    return allCategories
      .filter((category) => map.has(category))
      .map((category) => ({ category, rows: map.get(category)! }));
  }, [shoppingSummaries, shoppingFilter, allCategories]);

  const shoppingCount = useMemo(
    () => shoppingGroups.reduce((total, group) => total + group.rows.length, 0),
    [shoppingGroups]
  );

  const selectedTool = selectedToolId ? tools.find((tool) => tool.id === selectedToolId) ?? null : null;
  const acquisitionTool = pendingAcquisition ? tools.find((tool) => tool.id === pendingAcquisition.toolId) ?? null : null;
  const pendingMoveTool = pendingMoveToolId ? tools.find((tool) => tool.id === pendingMoveToolId) ?? null : null;
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
    if (next === 'handleliste' && houses.length === 0 && authHouse) setHouses([authHouse]);
  };

  const requireWrite = async (action: () => void) => {
    if (canWrite) {
      action();
      return;
    }
    if (await signIn()) action();
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

  const beginAcquisition = (tool: Tool) => {
    const scope = houses.length ? houses : HOUSES;
    const houseOptions = scope.filter((house) => effectiveNeed(tool, house) - pendingMoveCount(tool, house) > 0);
    if (!houseOptions.length) return;
    setPendingAcquisition({
      toolId: tool.id,
      fixedHouse: houses.length === 1 ? houses[0] : null,
      houseOptions,
    });
  };

  const markAcquired = (tool: Tool, destination: House, label: string, image: string) => {
    const before = structuredClone(tool);
    const override = tool.needOverride[destination];
    updateTool(tool.id, {
      instances: [...tool.instances, { id: generateId(), location: destination, image, label }],
      needOverride: {
        ...tool.needOverride,
        [destination]: typeof override === 'number' && override > 0 ? Math.max(0, override - 1) : override,
      },
    });
    setPendingAcquisition(null);
    notify(`${tool.name} er lagt til hos ${houseLabel(destination)}`, () => putTool(before));
  };

  const markMoved = (tool: Tool, destination: House) => {
    const instance = tool.instances.find((item) => item.moveTo === destination);
    if (!instance || !destination) return;
    const before = structuredClone(tool);
    const override = tool.needOverride[destination];
    updateTool(tool.id, {
      instances: tool.instances.map((item) => item.id === instance.id ? { ...item, location: destination, moveTo: null } : item),
      needOverride: {
        ...tool.needOverride,
        [destination]: typeof override === 'number' && override > 0 ? Math.max(0, override - 1) : override,
      },
    });
    setPendingMoveToolId(null);
    notify(`${instance.label || tool.name} er flyttet til ${houseLabel(destination)}`, () => putTool(before));
  };

  const postponeTool = (tool: Tool) => {
    const scope = houses.length ? houses : HOUSES;
    const before = structuredClone(tool);
    const postponed = { ...tool.postponed };
    scope.forEach((house) => { if (purchaseNeed(tool, house) > 0) postponed[house] = true; });
    updateTool(tool.id, { postponed });
    notify(`${tool.name} er flyttet til «Kjøp senere»`, () => putTool(before));
  };

  const resumeTool = (tool: Tool) => {
    const scope = houses.length ? houses : HOUSES;
    const before = structuredClone(tool);
    const postponed = { ...tool.postponed };
    scope.forEach((house) => { postponed[house] = false; });
    updateTool(tool.id, { postponed });
    notify(`${tool.name} er tilbake i handlelisten`, () => putTool(before));
  };

  const beginMoveCompletion = (tool: Tool) => {
    if (houses.length === 1) {
      markMoved(tool, houses[0]);
      return;
    }
    setPendingMoveToolId(tool.id);
  };

  const importRaschsveiInventory = () => {
    const result = runRaschsveiImport(tools, putTool);
    setProfileOpen(false);
    if (result.report.length) console.log('Import Raschs Vei:\n' + result.report.join('\n'));
    if (result.writes === 0) {
      notify('Beholdningen er allerede oppdatert – ingen endringer');
      return;
    }
    notify(`Import ferdig: ${result.created} nye, ${result.writes - result.created} oppdatert, ${result.unchanged} uendret`);
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
          {canWrite ? <button className="profile-button" onClick={() => setProfileOpen((value) => !value)} aria-expanded={profileOpen} aria-label="Åpne profilmeny"><HouseBadge house={currentHouse} size={38} /></button> : (
            <button className="header-login-button" onClick={() => void signIn()} disabled={signingIn}>{signingIn ? 'Logger inn…' : 'Logg inn'}</button>
          )}
          {canWrite && profileOpen && (
            <div className="profile-menu">
              <div className="profile-summary"><HouseBadge house={currentHouse} size={34} /><span><strong>{housePerson(currentHouse)}</strong><small>{houseLabel(currentHouse)}</small></span></div>
              {currentHouse === 'raschsvei' && <button onClick={importRaschsveiInventory}>Importer beholdning (Raschs Vei)</button>}
              <button onClick={logOut}>Logg ut</button>
            </div>
          )}
        </div>
      </header>

      {authError && <div className="auth-notice" role="alert">{authError}</div>}

      <main className="workspace" id="main">
        <section className="control-panel" aria-label="Søk og filtrering">
          <div className="search-wrap">
            <span aria-hidden="true">⌕</span>
            <label className="sr-only" htmlFor="tool-search">Søk i verktøy</label>
            <input id="tool-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Søk etter verktøy, kategori eller notat…" />
            {search && <button onClick={() => setSearch('')} aria-label="Tøm søk">×</button>}
          </div>
          <FilterBar intent={intent} houses={houses} onIntentChange={setViewIntent} onHousesChange={setHouses} />
          {intent === 'handleliste' && <ShoppingFilterBar value={shoppingFilter} counts={shoppingCounts} onChange={setShoppingFilter} />}
          <div className="result-meta"><span>{intent === 'handleliste' ? `${shoppingCount} gjøremål` : `${filtered.length} av ${tools.length} verktøy`}</span>{intent === 'handleliste' && shoppingCounts.alle > 0 && <button className="text-button" onClick={shareList}>↥ Del handlelisten</button>}</div>
        </section>

        {loading ? (
          <div className="skeleton-grid" aria-label="Laster verktøy">{Array.from({ length: 8 }, (_, index) => <div className="skeleton" key={index} />)}</div>
        ) : (
          <>
            {duplicatePair && !selectMode && intent !== 'handleliste' && (
              <aside className="duplicate-banner"><span>◇</span><span><strong>Disse ligner på hverandre</strong>{duplicatePair[0].name} og {duplicatePair[1].name}</span><button onClick={() => void requireWrite(() => { setSelectedIds(new Set(duplicatePair.map((tool) => tool.id))); setSelectMode(true); setShowMerge(true); })}>Slå sammen</button></aside>
            )}
            {intent === 'handleliste' ? (
              shoppingGroups.length > 0 ? (
                <ShoppingListTable
                  groups={shoppingGroups}
                  onOpen={(tool) => setSelectedToolId(tool.id)}
                  onAcquired={(tool) => void requireWrite(() => beginAcquisition(tool))}
                  onMoved={(tool) => void requireWrite(() => beginMoveCompletion(tool))}
                  onPostpone={(tool) => void requireWrite(() => postponeTool(tool))}
                  onResume={(tool) => void requireWrite(() => resumeTool(tool))}
                />
              ) : (
                <section className="empty-state"><div><ToolGlyph /></div><h2>{search ? `Ingen treff på «${search}»` : shoppingFilter === 'senere' ? 'Ingenting er utsatt til senere' : shoppingFilter === 'kjop' ? 'Ingenting å kjøpe akkurat nå' : shoppingFilter === 'flytt' ? 'Ingenting skal flyttes akkurat nå' : `Handlelisten er tom${houses.length === 1 ? ` for ${housePerson(houses[0])}` : ''}`}</h2><p>{search ? 'Prøv et annet navn, eller tøm søket.' : 'Bytt filter for å se resten av gjøremålene.'}</p><button className="secondary-button" onClick={() => { setSearch(''); setShoppingFilter('alle'); }}>Vis hele handlelisten</button></section>
              )
            ) : (
            <>
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
                      selectMode={selectMode}
                      selected={selectedIds.has(tool.id)}
                      onClick={() => toggleSelected(tool)}
                      onLongPress={() => void requireWrite(() => enterSelectMode(tool))}
                      onAcquired={() => void requireWrite(() => beginAcquisition(tool))}
                      onMoved={() => void requireWrite(() => beginMoveCompletion(tool))}
                    />
                  ))}</div>}
                </section>
              );
            })}
            {grouped.length === 0 && (
              <section className="empty-state"><div><ToolGlyph /></div><h2>{search ? `Ingen treff på «${search}»` : 'Ingen verktøy i denne visningen'}</h2><p>{search ? 'Prøv et annet navn, eller tøm søket.' : 'Bytt filter for å se resten av verktøyene.'}</p><button className="secondary-button" onClick={() => { setSearch(''); setIntent('alle'); setHouses([]); }}>Vis alle verktøy</button></section>
            )}
            </>
            )}
          </>
        )}
      </main>

      {!selectMode ? <button className="add-tool-fab" onClick={() => void requireWrite(() => setShowAddTool(true))} aria-label={canWrite ? 'Legg til verktøy' : 'Logg inn for å legge til verktøy'}><span>+</span><b>{canWrite ? 'Legg til' : 'Logg inn'}</b></button> : (
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

      {acquisitionTool && pendingAcquisition && <InstanceDetailsDialog
        open
        toolName={acquisitionTool.name}
        fixedHouse={pendingAcquisition.fixedHouse}
        houseOptions={pendingAcquisition.houseOptions}
        confirmLabel="Anskaffet"
        onConfirm={({ house, label, image }) => markAcquired(acquisitionTool, house, label, image)}
        onCancel={() => setPendingAcquisition(null)}
      />}

      <HouseActionDialog
        open={Boolean(pendingMoveTool)}
        title={`Marker ${pendingMoveTool?.name ?? 'verktøyet'} som flyttet`}
        message="Hvilken adresse gjelder handlingen?"
        houses={pendingMoveTool ? HOUSES.filter((house) => pendingMoveCount(pendingMoveTool, house) > 0) : []}
        onChoose={(house) => pendingMoveTool && markMoved(pendingMoveTool, house)}
        onCancel={() => setPendingMoveToolId(null)}
      />

      {notice && <div className="snackbar" role="status"><span>{notice.message}</span>{notice.undo && <button onClick={() => void requireWrite(() => { notice.undo?.(); setNotice(null); })}>Angre</button>}<button aria-label="Lukk melding" onClick={() => setNotice(null)}>×</button></div>}
    </div>
  );
}
