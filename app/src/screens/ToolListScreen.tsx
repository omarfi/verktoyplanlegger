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
  otherHouse,
  pendingMoveCount,
  formatNok,
  purchaseNeed,
  purchaseSubtotalMinor,
  selectedPurchaseOption,
  shoppingListText,
  shoppingSummary,
  toolMatchesSearch,
  toolThumbnail,
  type ShoppingFilter,
  type ViewIntent,
} from '../logic';
import type { Tool, House, PurchaseOption } from '../types';
import { ToolCard } from '../components/ToolCard';
import { FilterBar } from '../components/FilterBar';
import { ShoppingFilterBar } from '../components/ShoppingFilterBar';
import {
  ShoppingBoard,
  type ShoppingBoardActiveRow,
  type ShoppingBoardDoneRow,
  type ShoppingBoardLaterRow,
  type ShoppingBoardRow,
  type ShoppingHouseBoardData,
} from '../components/ShoppingBoard';
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
      shoppingFilter: ['alle', 'kjop', 'flytt'].includes(saved.shoppingFilter) ? saved.shoppingFilter : 'alle',
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

/** En nylig fullført rad (anskaffet/flyttet) som blir stående som kvittert i handlelisten til den angres. */
interface CompletionEntry {
  id: string;
  toolId: string;
  house: House;
  category: string;
  kind: 'acquired' | 'moved';
  name: string;
  image: string;
  undo: () => void;
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
  const [completions, setCompletions] = useState<CompletionEntry[]>([]);
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

  // Toppfilterets teller (Alt/Kjøp/Flytt) summerer på tvers av valgte hus.
  const shoppingSummaries = useMemo(
    () => filtered.map((tool) => ({ tool, summary: shoppingSummary(tool, houses) })),
    [filtered, houses]
  );

  const shoppingCounts = useMemo(() => {
    const counts: Record<ShoppingFilter, number> = { alle: 0, kjop: 0, flytt: 0 };
    shoppingSummaries.forEach(({ summary }) => {
      (['alle', 'kjop', 'flytt'] as ShoppingFilter[]).forEach((key) => {
        if (matchesShoppingFilter(summary, key)) counts[key] += 1;
      });
    });
    return counts;
  }, [shoppingSummaries]);

  const scopeHouses = houses.length ? houses : HOUSES;

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

  // Handlelistekortene vet allerede hvilket hus raden gjelder, så det er ingen husvalg å gjøre.
  const beginAcquisitionFor = (tool: Tool, house: House) => {
    if (effectiveNeed(tool, house) - pendingMoveCount(tool, house) <= 0) return;
    setPendingAcquisition({ toolId: tool.id, fixedHouse: house, houseOptions: [house] });
  };

  const addCompletion = (entry: Omit<CompletionEntry, 'id'>) => {
    setCompletions((current) => [...current, { ...entry, id: generateId() }]);
  };

  const undoCompletion = (entry: CompletionEntry) => {
    entry.undo();
    setCompletions((current) => current.filter((item) => item.id !== entry.id));
  };

  const markAcquired = (tool: Tool, destination: House, label: string, image: string) => {
    const before = structuredClone(tool);
    const override = tool.needOverride[destination];
    const option = selectedPurchaseOption(tool, destination);
    updateTool(tool.id, {
      instances: [...tool.instances, {
        id: generateId(),
        location: destination,
        image: image || option?.imageUrl || '',
        label: label || option?.productName || '',
        ...(option ? {
          purchase: {
            optionId: option.id,
            url: option.url,
            retailer: option.retailer,
            productName: option.productName,
            priceMinor: option.priceMinor,
            currency: 'NOK' as const,
            acquiredAt: new Date().toISOString(),
          },
        } : {}),
      }],
      needOverride: {
        ...tool.needOverride,
        [destination]: typeof override === 'number' && override > 0 ? Math.max(0, override - 1) : override,
      },
    });
    setPendingAcquisition(null);
    addCompletion({
      toolId: tool.id,
      house: destination,
      category: tool.category,
      kind: 'acquired',
      name: label || option?.productName || tool.name,
      image: image || option?.imageUrl || toolThumbnail(tool),
      undo: () => putTool(before),
    });
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
    addCompletion({
      toolId: tool.id,
      house: destination,
      category: tool.category,
      kind: 'moved',
      name: instance.label || tool.name,
      image: instance.image || toolThumbnail(tool),
      undo: () => putTool(before),
    });
  };

  const postponeTool = (tool: Tool, house: House) => {
    if (purchaseNeed(tool, house) <= 0) return;
    const before = structuredClone(tool);
    updateTool(tool.id, { postponed: { ...tool.postponed, [house]: true } });
    notify(`${tool.name} er flyttet til «Kjøp senere»`, () => putTool(before));
  };

  const resumeTool = (tool: Tool, house: House) => {
    const before = structuredClone(tool);
    updateTool(tool.id, { postponed: { ...tool.postponed, [house]: false } });
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

  const savePurchaseOption = (tool: Tool, house: House, option: PurchaseOption) => {
    const duplicate = tool.purchaseOptions.find((item) =>
      item.id !== option.id && (item.canonicalUrl || item.url) === (option.canonicalUrl || option.url)
    );
    const saved = duplicate ? { ...option, id: duplicate.id } : option;
    const purchaseOptions = duplicate
      ? tool.purchaseOptions.map((item) => item.id === duplicate.id ? saved : item)
      : tool.purchaseOptions.some((item) => item.id === saved.id)
        ? tool.purchaseOptions.map((item) => item.id === saved.id ? saved : item)
        : [...tool.purchaseOptions, saved];
    updateTool(tool.id, {
      purchaseOptions,
      selectedPurchaseOption: tool.selectedPurchaseOption[house]
        ? tool.selectedPurchaseOption
        : { ...tool.selectedPurchaseOption, [house]: saved.id },
    });
    notify(duplicate ? 'Eksisterende kandidat er oppdatert' : 'Innkjøpskandidaten er lagret');
  };

  const selectPurchaseOptionFor = (tool: Tool, house: House, optionId: string) => {
    if (!tool.purchaseOptions.some((option) => option.id === optionId)) return;
    updateTool(tool.id, { selectedPurchaseOption: { ...tool.selectedPurchaseOption, [house]: optionId } });
  };

  const removePurchaseOption = (tool: Tool, optionId: string) => {
    updateTool(tool.id, {
      purchaseOptions: tool.purchaseOptions.filter((option) => option.id !== optionId),
      selectedPurchaseOption: {
        osterliveien: tool.selectedPurchaseOption.osterliveien === optionId ? null : tool.selectedPurchaseOption.osterliveien,
        raschsvei: tool.selectedPurchaseOption.raschsvei === optionId ? null : tool.selectedPurchaseOption.raschsvei,
      },
    });
  };

  // Handlelisten som ett kort per adresse: gruppert på kategori innenfor hvert hus,
  // med kvitterte rader og «Kjøp senere» stående i listen til de blir angret.
  const houseBoards: ShoppingHouseBoardData[] = scopeHouses.map((house) => {
    const rowsByCategory = new Map<string, ShoppingBoardRow[]>();
    const pushRow = (category: string, row: ShoppingBoardRow) => {
      rowsByCategory.set(category, [...(rowsByCategory.get(category) ?? []), row]);
    };
    const later: ShoppingHouseBoardData['later'] = [];
    let badgeCount = 0;
    let totalMinor = 0;
    let missingPriceCount = 0;

    filtered.forEach((tool) => {
      const summary = shoppingSummary(tool, [house]);
      const move = summary.moves[0]?.count ?? 0;
      const buy = summary.buys[0]?.count ?? 0;
      const laterCount = summary.laters[0]?.count ?? 0;
      badgeCount += move + buy;

      if (move > 0 && (shoppingFilter === 'alle' || shoppingFilter === 'flytt')) {
        pushRow(tool.category, {
          state: 'active',
          key: `move-${tool.id}`,
          toolId: tool.id,
          name: tool.name,
          image: toolThumbnail(tool),
          avansert: tool.type === 'avansert',
          kind: 'move',
          count: move,
          fromHouseLabel: houseLabel(otherHouse(house)),
          purchaseOptions: [],
          selectedOptionId: null,
          selectedOption: null,
          subtotalMinor: null,
        });
      }
      if (buy > 0 && (shoppingFilter === 'alle' || shoppingFilter === 'kjop')) {
        const option = selectedPurchaseOption(tool, house);
        const subtotalMinor = purchaseSubtotalMinor(tool, house);
        if (subtotalMinor === null) missingPriceCount += 1;
        else totalMinor += subtotalMinor;
        pushRow(tool.category, {
          state: 'active',
          key: `buy-${tool.id}`,
          toolId: tool.id,
          name: tool.name,
          image: toolThumbnail(tool),
          avansert: tool.type === 'avansert',
          kind: 'buy',
          count: buy,
          purchaseOptions: tool.purchaseOptions,
          selectedOptionId: tool.selectedPurchaseOption[house],
          selectedOption: option,
          subtotalMinor,
        });
      }
      if (laterCount > 0) {
        later.push({
          key: `later-${tool.id}`,
          toolId: tool.id,
          name: tool.name,
          image: toolThumbnail(tool),
          sublabel: `Utsatt · ${tool.category}`,
        });
      }
    });

    completions
      .filter((entry) => entry.house === house)
      .forEach((entry) => {
        pushRow(entry.category, {
          state: 'done',
          key: entry.id,
          completionId: entry.id,
          toolId: entry.toolId,
          name: entry.name,
          image: entry.image,
          kind: entry.kind,
        });
      });

    const groups = allCategories
      .filter((category) => rowsByCategory.has(category))
      .map((category) => ({ category, rows: rowsByCategory.get(category)! }));

    return { house, badgeCount, groups, later, totalMinor, missingPriceCount };
  });

  const hasShoppingContent = houseBoards.some((board) => board.groups.length > 0 || board.later.length > 0);

  const shoppingCount = houseBoards.reduce((total, board) => total + board.groups.reduce(
    (sum, group) => sum + group.rows.filter((row) => row.state === 'active').length, 0
  ), 0);
  const shoppingTotalMinor = houseBoards.reduce((total, board) => total + board.totalMinor, 0);
  const shoppingMissingPrices = houseBoards.reduce((total, board) => total + board.missingPriceCount, 0);

  const handleBoardCheckOffActive = (row: ShoppingBoardActiveRow, house: House) => {
    const tool = tools.find((item) => item.id === row.toolId);
    if (!tool) return;
    void requireWrite(() => row.kind === 'move' ? markMoved(tool, house) : beginAcquisitionFor(tool, house));
  };

  const handleBoardPostpone = (row: ShoppingBoardActiveRow, house: House) => {
    const tool = tools.find((item) => item.id === row.toolId);
    if (tool) void requireWrite(() => postponeTool(tool, house));
  };

  const handleBoardCheckOffLater = (row: ShoppingBoardLaterRow, house: House) => {
    const tool = tools.find((item) => item.id === row.toolId);
    if (tool) void requireWrite(() => beginAcquisitionFor(tool, house));
  };

  const handleBoardResumeLater = (row: ShoppingBoardLaterRow, house: House) => {
    const tool = tools.find((item) => item.id === row.toolId);
    if (tool) void requireWrite(() => resumeTool(tool, house));
  };

  const handleBoardUndo = (row: ShoppingBoardDoneRow) => {
    const entry = completions.find((item) => item.id === row.completionId);
    if (entry) void requireWrite(() => undoCompletion(entry));
  };

  const handleSavePurchaseOption = (row: ShoppingBoardActiveRow, house: House, option: PurchaseOption) => {
    const tool = tools.find((item) => item.id === row.toolId);
    if (tool) void requireWrite(() => savePurchaseOption(tool, house, option));
  };

  const handleSelectPurchaseOption = (row: ShoppingBoardActiveRow, house: House, optionId: string) => {
    const tool = tools.find((item) => item.id === row.toolId);
    if (tool) void requireWrite(() => selectPurchaseOptionFor(tool, house, optionId));
  };

  const handleRemovePurchaseOption = (row: ShoppingBoardActiveRow, _house: House, optionId: string) => {
    const tool = tools.find((item) => item.id === row.toolId);
    if (tool) void requireWrite(() => removePurchaseOption(tool, optionId));
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
          <div className="result-meta"><span>{intent === 'handleliste' ? `${shoppingCount} gjøremål${shoppingTotalMinor > 0 ? ` · ${formatNok(shoppingTotalMinor)}` : ''}${shoppingMissingPrices > 0 ? ` · ${shoppingMissingPrices} uten pris` : ''}` : `${filtered.length} av ${tools.length} verktøy`}</span>{intent === 'handleliste' && shoppingCounts.alle > 0 && <button className="text-button" onClick={shareList}>↥ Del handlelisten</button>}</div>
        </section>

        {loading ? (
          <div className="skeleton-grid" aria-label="Laster verktøy">{Array.from({ length: 8 }, (_, index) => <div className="skeleton" key={index} />)}</div>
        ) : (
          <>
            {duplicatePair && !selectMode && intent !== 'handleliste' && (
              <aside className="duplicate-banner"><span>◇</span><span><strong>Disse ligner på hverandre</strong>{duplicatePair[0].name} og {duplicatePair[1].name}</span><button onClick={() => void requireWrite(() => { setSelectedIds(new Set(duplicatePair.map((tool) => tool.id))); setSelectMode(true); setShowMerge(true); })}>Slå sammen</button></aside>
            )}
            {intent === 'handleliste' ? (
              hasShoppingContent ? (
                <ShoppingBoard
                  boards={houseBoards}
                  onOpenTool={(toolId) => setSelectedToolId(toolId)}
                  onCheckOffActive={handleBoardCheckOffActive}
                  onPostpone={handleBoardPostpone}
                  onCheckOffLater={handleBoardCheckOffLater}
                  onResumeLater={handleBoardResumeLater}
                  onUndo={handleBoardUndo}
                  onSavePurchaseOption={handleSavePurchaseOption}
                  onSelectPurchaseOption={handleSelectPurchaseOption}
                  onRemovePurchaseOption={handleRemovePurchaseOption}
                />
              ) : (
                <section className="empty-state"><div><ToolGlyph /></div><h2>{search ? `Ingen treff på «${search}»` : shoppingFilter === 'kjop' ? 'Ingenting å kjøpe akkurat nå' : shoppingFilter === 'flytt' ? 'Ingenting skal flyttes akkurat nå' : `Handlelisten er tom${houses.length === 1 ? ` for ${housePerson(houses[0])}` : ''}`}</h2><p>{search ? 'Prøv et annet navn, eller tøm søket.' : 'Bytt filter for å se resten av gjøremålene.'}</p><button className="secondary-button" onClick={() => { setSearch(''); setShoppingFilter('alle'); }}>Vis hele handlelisten</button></section>
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
        initialLabel={pendingAcquisition.fixedHouse ? selectedPurchaseOption(acquisitionTool, pendingAcquisition.fixedHouse)?.productName ?? '' : ''}
        initialImage={pendingAcquisition.fixedHouse ? selectedPurchaseOption(acquisitionTool, pendingAcquisition.fixedHouse)?.imageUrl ?? '' : ''}
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
