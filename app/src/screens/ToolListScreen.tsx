import { useMemo, useState } from 'react';
import { useApp, useAuth } from '../context';
import { matchesFilter, toolMatchesSearch, type Filter } from '../logic';
import { CATEGORY_ORDER } from '../categories';
import type { Tool } from '../types';
import { ToolCard } from '../components/ToolCard';
import { FilterBar } from '../components/FilterBar';
import { EditToolSheet } from '../components/EditToolSheet';
import { AddToolModal } from '../components/AddToolModal';
import { MergeDialog } from '../components/MergeDialog';

export function ToolListScreen() {
  const { tools, loading, mergeTools } = useApp();
  const { logOut } = useAuth();
  const [filter, setFilter] = useState<Filter>({ house: 'begge', status: 'alle' });
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showAddTool, setShowAddTool] = useState(false);
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showMerge, setShowMerge] = useState(false);

  const allCategories = useMemo(() => {
    const cats = new Set(CATEGORY_ORDER);
    for (const t of tools) cats.add(t.category);
    return [...cats];
  }, [tools]);

  const filtered = useMemo(
    () => tools.filter((t) => matchesFilter(t, filter) && toolMatchesSearch(t, search)),
    [tools, filter, search]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Tool[]>();
    for (const t of filtered) {
      if (!map.has(t.category)) map.set(t.category, []);
      map.get(t.category)!.push(t);
    }
    const result: [string, Tool[]][] = [];
    for (const cat of CATEGORY_ORDER) {
      if (map.has(cat)) result.push([cat, map.get(cat)!]);
    }
    for (const [cat, catTools] of map) {
      if (!CATEGORY_ORDER.includes(cat)) result.push([cat, catTools]);
    }
    return result;
  }, [filtered]);

  const selectedTool = selectedToolId ? tools.find((t) => t.id === selectedToolId) ?? null : null;
  const selectedTools = useMemo(
    () => tools.filter((t) => selectedIds.has(t.id)),
    [tools, selectedIds]
  );

  const toggleCategory = (cat: string) => {
    setCollapsed((c) => ({ ...c, [cat]: !c[cat] }));
  };

  const handleCardClick = (tool: Tool) => {
    if (selectMode) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(tool.id)) next.delete(tool.id);
        else next.add(tool.id);
        return next;
      });
    } else {
      setSelectedToolId(tool.id);
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  return (
    <div className="app-shell">
      <div className="header">
        <div className="header-main">
          <div>
            <div className="header-title">Verktøyplanlegger</div>
            <div className="header-subtitle">
              {loading ? 'Laster...' : `${filtered.length} av ${tools.length} verktøy`}
            </div>
          </div>
          <div className="header-actions">
            <button
              className={`btn btn-ghost btn-small ${selectMode ? 'active-ghost' : ''}`}
              onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
            >
              {selectMode ? 'Avbryt' : 'Velg'}
            </button>
            <button className="btn btn-ghost btn-small" onClick={logOut}>Logg ut</button>
          </div>
        </div>
        <div className="toolbar">
          <input
            className="search-input"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Søk verktøy…"
            aria-label="Søk"
          />
          <FilterBar filter={filter} onChange={setFilter} tools={tools} />
        </div>
      </div>

      {grouped.map(([category, catTools]) => (
        <div key={category} className="category-group">
          <div className="category-header" onClick={() => toggleCategory(category)}>
            <div className="category-header-left">
              <span className={`category-chevron ${!collapsed[category] ? 'open' : ''}`}>&#9654;</span>
              <span className="category-name">{category}</span>
            </div>
            <span className="category-count">{catTools.length}</span>
          </div>
          {!collapsed[category] && (
            <div className="tool-grid">
              {catTools.map((tool) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  onClick={() => handleCardClick(tool)}
                  selectMode={selectMode}
                  selected={selectedIds.has(tool.id)}
                />
              ))}
            </div>
          )}
        </div>
      ))}

      {!loading && grouped.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">&#128295;</div>
          <div className="empty-state-text">Ingen verktøy matcher søket</div>
        </div>
      )}

      {!selectMode && (
        <button className="add-tool-fab" onClick={() => setShowAddTool(true)} aria-label="Legg til verktøy">+</button>
      )}

      {selectMode && (
        <div className="select-bar">
          <span className="select-bar-count">{selectedIds.size} valgt</span>
          <button
            className="btn btn-primary"
            disabled={selectedIds.size < 2}
            onClick={() => setShowMerge(true)}
          >
            Slå sammen
          </button>
        </div>
      )}

      <AddToolModal open={showAddTool} categories={allCategories} onClose={() => setShowAddTool(false)} />

      {showMerge && (
        <MergeDialog
          open
          tools={selectedTools}
          categories={allCategories}
          onClose={() => setShowMerge(false)}
          onConfirm={(meta) => {
            mergeTools([...selectedIds], meta);
            setShowMerge(false);
            exitSelectMode();
          }}
        />
      )}

      {selectedTool && (
        <EditToolSheet
          key={selectedTool.id}
          tool={selectedTool}
          categories={allCategories}
          onClose={() => setSelectedToolId(null)}
        />
      )}
    </div>
  );
}
