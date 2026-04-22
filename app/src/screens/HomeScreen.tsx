import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store';
import { getStatus } from '../logic';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import type { FilterStatus } from '../types';
import { getCategoryOrder } from '../seedData';

const FILTER_OPTIONS: { key: FilterStatus; label: string }[] = [
  { key: 'all', label: 'Alle' },
  { key: 'new', label: 'Nye' },
  { key: 'gap', label: 'Mangler' },
  { key: 'shopping', label: 'Handler' },
  { key: 'done', label: 'Ferdig' },
];

export function HomeScreen() {
  const { state, addCustomTool } = useApp();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showAddTool, setShowAddTool] = useState(false);
  const [newToolName, setNewToolName] = useState('');
  const [newToolCategory, setNewToolCategory] = useState('');
  const [newCustomCategory, setNewCustomCategory] = useState('');

  // All categories: seed + any custom ones from Firestore
  const allCategories = useMemo(() => {
    const seedCats = getCategoryOrder();
    const allCats = new Set(seedCats);
    for (const t of state.tools) allCats.add(t.category);
    return [...allCats];
  }, [state.tools]);

  const toolsWithStatus = useMemo(
    () => state.tools.map((t) => ({ ...t, status: getStatus(t) })),
    [state.tools]
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: toolsWithStatus.length, new: 0, gap: 0, shopping: 0, done: 0, move: 0 };
    for (const t of toolsWithStatus) counts[t.status] = (counts[t.status] || 0) + 1;
    return counts;
  }, [toolsWithStatus]);

  const filtered = useMemo(() => {
    if (filter === 'all') return toolsWithStatus;
    return toolsWithStatus.filter((t) => t.status === filter);
  }, [toolsWithStatus, filter]);

  const categoryOrder = getCategoryOrder();
  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const t of filtered) {
      if (!map.has(t.category)) map.set(t.category, []);
      map.get(t.category)!.push(t);
    }
    const result: [string, typeof filtered][] = [];
    for (const cat of categoryOrder) {
      if (map.has(cat)) result.push([cat, map.get(cat)!]);
    }
    for (const [cat, tools] of map) {
      if (!categoryOrder.includes(cat)) result.push([cat, tools]);
    }
    return result;
  }, [filtered, categoryOrder]);

  const doneCount = statusCounts.done || 0;
  const totalCount = toolsWithStatus.length;
  const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

  const toggleCategory = (cat: string) => {
    setCollapsed((c) => ({ ...c, [cat]: !c[cat] }));
  };

  const handleAddTool = () => {
    if (!newToolName.trim()) return;
    const category = newToolCategory === '__new__'
      ? newCustomCategory.trim()
      : newToolCategory;
    if (!category) return;
    addCustomTool(newToolName.trim(), category, 'basic');
    setNewToolName('');
    setNewToolCategory('');
    setNewCustomCategory('');
    setShowAddTool(false);
  };

  const getCategoryDoneCount = (cat: string) => {
    const catTools = toolsWithStatus.filter((t) => t.category === cat);
    const done = catTools.filter((t) => t.status === 'done').length;
    return `${done}/${catTools.length}`;
  };

  const categoryIcon = (category: string) => {
    const map: Record<string, string> = {
      'Måleverktøy': 'M3 14 L17 6 M3 16 L17 8 M4 4 L7 4',
      'Merkeverktøy': 'M4 16 L14 6 L16 8 L6 18 L4 18 Z',
      'Skrutrekkere og bits': 'M4 6 L12 14 M12 14 L16 18 M12 14 L18 8',
      'Nøkler': 'M6 7 A3 3 0 1 1 6 13 L14 21 L16 19 L14 17 L16 15 L12 11',
      'Tenger': 'M6 5 L10 11 L6 17 M14 5 L10 11 L14 17',
      'Klemmer og tvinger': 'M5 6 L15 6 L15 10 L9 10 L9 14 L15 14 L15 18',
      'Skjæreverktøy': 'M4 16 L16 4 M12 4 L16 8',
      'Slagverktøy': 'M5 7 L13 7 L13 11 L9 11 L9 18',
      'Åpne- og riveverktøy': 'M4 16 L10 10 L16 12',
      'Slipeverktøy': 'M4 13 L8 9 L16 17 L12 21 Z',
      'Elektrisk håndverktøy': 'M10 3 L6 11 H10 L8 19 L14 11 H10 Z',
      'Rengjøring og vedlikehold': 'M5 7 L13 15 M13 15 L16 12 M9 3 L12 6',
      'Oppbevaring': 'M4 8 H16 V18 H4 Z M4 11 H16',
      'Arbeidslys': 'M10 4 L15 8 V14 L10 18 L5 14 V8 Z',
    };
    return map[category] || 'M4 10 H16 M10 4 V16';
  };

  const getNeedCount = (type: 'basic' | 'advanced') => (type === 'basic' ? 2 : 1);

  const getOwnCount = (tool: { inventory: { location: string }[]; type: 'basic' | 'advanced' }) => {
    const need = getNeedCount(tool.type);
    return Math.min(tool.inventory.length, need);
  };

  const getFractionColor = (tool: { type: 'basic' | 'advanced'; inventory: { location: string }[]; inventoryDone: boolean }) => {
    const own = getOwnCount(tool);
    const need = getNeedCount(tool.type);
    if (!tool.inventoryDone) return '#bbb';
    if (own >= need) return '#1D9E75';
    if (own > 0) return '#BA7517';
    return '#C0392B';
  };

  const HouseIcon = ({ color, filled }: { color: string; filled: boolean }) => (
    <svg viewBox="0 0 20 20" width="13" height="13" style={!filled ? { opacity: 0.5 } : undefined}>
      <path
        d="M3 10 L10 4 L17 10"
        fill="none"
        stroke={color}
        strokeWidth={filled ? 1.6 : 1.2}
        strokeDasharray={filled ? undefined : '2.5 2'}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="5"
        y="10"
        width="10"
        height="8"
        rx="1"
        fill={filled ? color : 'none'}
        fillOpacity={filled ? 0.85 : 1}
        stroke={color}
        strokeWidth={filled ? 0 : 1.2}
        strokeDasharray={filled ? undefined : '2.5 2'}
      />
      {filled && <rect x="8.5" y="13" width="3" height="5" rx="0.5" fill="#fff" fillOpacity={0.7} />}
    </svg>
  );

  return (
    <>
      <div className="header">
        <div className="header-row">
          <div className="header-title">Verktøyplanlegger</div>
          <button className="gear-btn" onClick={() => navigate('/settings')}>&#9881;</button>
        </div>
        <div className="header-subtitle">{doneCount} av {totalCount} ferdig</div>
        <div className="progress-bar-container">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="filter-pills">
        {FILTER_OPTIONS.map((f) => (
          <button
            key={f.key}
            className={`filter-pill ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            <span className="filter-pill-count">{statusCounts[f.key] || 0}</span>
          </button>
        ))}
      </div>

      {grouped.map(([category, tools]) => (
        <div key={category} className="category-group">
          <div className="category-header" onClick={() => toggleCategory(category)}>
            <div className="category-header-left">
              <span className={`category-chevron ${!collapsed[category] ? 'open' : ''}`}>&#9654;</span>
              <span className="category-name">{category}</span>
            </div>
            <span className="category-count">{getCategoryDoneCount(category)}</span>
          </div>
          {!collapsed[category] && (
            <div className="tool-grid">
              {tools.map((tool) => {
                const image = tool.inventory.find((i) => i.image)?.image
                  || tool.candidates.find((c) => c.image)?.image
                  || null;
                const own = getOwnCount(tool);
                const need = getNeedCount(tool.type);
                const hasMine = tool.inventory.some((i) => i.location === 'mine');
                const hasParents = tool.inventory.some((i) => i.location === 'parents');

                return (
                  <div key={tool.id} className="tool-card" onClick={() => navigate(`/tool/${tool.id}`)}>
                    <div className="tool-card-image">
                      {image ? (
                        <img src={image} alt={tool.name} />
                      ) : (
                        <div className="tool-card-placeholder" aria-hidden="true">
                          <svg viewBox="0 0 20 20" width="28" height="28">
                            <path d={categoryIcon(tool.category)} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      )}
                      <div className="tool-card-badge">
                        <StatusBadge status={tool.status} />
                      </div>
                      {tool.inventoryDone && (
                        <div className="tool-houses-overlay">
                          <HouseIcon color="#C0392B" filled={hasMine} />
                          {tool.type === 'basic' && <HouseIcon color="#7f8c8d" filled={hasParents} />}
                        </div>
                      )}
                    </div>
                    <div className="tool-card-info">
                      <div className="tool-card-name">{tool.name}</div>
                      <div className="tool-card-meta compact">
                        <span className="tool-card-fraction" style={{ color: getFractionColor(tool) }}>
                          {own}/{need}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {grouped.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">&#128295;</div>
          <div className="empty-state-text">Ingen verktøy matcher filteret</div>
        </div>
      )}

      <button className="add-tool-fab" onClick={() => setShowAddTool(true)}>+</button>

      <Modal open={showAddTool} onClose={() => { setShowAddTool(false); setNewToolCategory(''); setNewCustomCategory(''); }} title="Legg til verktøy">
        <div className="form-group">
          <label className="form-label">Navn *</label>
          <input
            className="form-input"
            value={newToolName}
            onChange={(e) => setNewToolName(e.target.value)}
            placeholder="F.eks. Sirkelsag"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Kategori *</label>
          <select
            className="form-input"
            value={newToolCategory}
            onChange={(e) => setNewToolCategory(e.target.value)}
          >
            <option value="">Velg kategori...</option>
            {allCategories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
            <option value="__new__">+ Ny kategori</option>
          </select>
        </div>
        {newToolCategory === '__new__' && (
          <div className="form-group">
            <label className="form-label">Ny kategori *</label>
            <input
              className="form-input"
              value={newCustomCategory}
              onChange={(e) => setNewCustomCategory(e.target.value)}
              placeholder="F.eks. Elektroverktøy"
            />
          </div>
        )}
        <button
          className="btn btn-primary btn-full"
          onClick={handleAddTool}
          disabled={!newToolName.trim() || (!newToolCategory || (newToolCategory === '__new__' && !newCustomCategory.trim()))}
        >
          Legg til
        </button>
      </Modal>
    </>
  );
}
