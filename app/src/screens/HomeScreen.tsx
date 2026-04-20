import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store';
import { getStatus } from '../logic';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import type { FilterStatus } from '../types';
import { getCategoryOrder } from '../seedData';
import { classifyTool } from '../ai';

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
    // "done" filter also includes "move" status tools that are done
    return toolsWithStatus.filter((t) => t.status === filter);
  }, [toolsWithStatus, filter]);

  const categoryOrder = getCategoryOrder();
  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const t of filtered) {
      if (!map.has(t.category)) map.set(t.category, []);
      map.get(t.category)!.push(t);
    }
    // Sort by category order
    const result: [string, typeof filtered][] = [];
    for (const cat of categoryOrder) {
      if (map.has(cat)) result.push([cat, map.get(cat)!]);
    }
    // Add any custom categories not in seed
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

  const handleAddTool = async () => {
    if (!newToolName.trim()) return;
    const category = newToolCategory.trim() || 'Annet';
    const type = await classifyTool(newToolName);
    addCustomTool(newToolName.trim(), category, type);
    setNewToolName('');
    setNewToolCategory('');
    setShowAddTool(false);
  };

  const getCategoryDoneCount = (cat: string) => {
    const catTools = toolsWithStatus.filter((t) => t.category === cat);
    const done = catTools.filter((t) => t.status === 'done').length;
    return `${done}/${catTools.length}`;
  };

  return (
    <>
      <div className="header">
        <div className="header-row">
          <div className="header-title">Verktøyplanlegger</div>
          <button className="gear-btn" onClick={() => navigate('/settings')}>⚙</button>
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
              <span className={`category-chevron ${!collapsed[category] ? 'open' : ''}`}>▶</span>
              <span className="category-name">{category}</span>
              <span className="category-count">{getCategoryDoneCount(category)}</span>
            </div>
          </div>
          {!collapsed[category] && (
            <div className="tool-grid">
              {tools.map((tool) => {
                const image = tool.inventory.find((i) => i.image)?.image
                  || tool.candidates.find((c) => c.image)?.image
                  || null;

                return (
                  <div key={tool.id} className="tool-card" onClick={() => navigate(`/tool/${tool.id}`)}>
                    <div className="tool-card-image">
                      {image ? (
                        <img src={image} alt={tool.name} />
                      ) : (
                        <div className="tool-card-placeholder">🔧</div>
                      )}
                      <div className="tool-card-badge">
                        <StatusBadge status={tool.status} />
                      </div>
                    </div>
                    <div className="tool-card-info">
                      <div className="tool-card-name">{tool.name}</div>
                      <div className="tool-card-meta">
                        {tool.type === 'basic' ? 'Grunnleggende' : 'Avansert'}
                        {tool.inventory.length > 0 && ` · ${tool.inventory.length} stk`}
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
          <div className="empty-state-icon">🔧</div>
          <div className="empty-state-text">Ingen verktøy matcher filteret</div>
        </div>
      )}

      <button className="add-tool-fab" onClick={() => setShowAddTool(true)}>+</button>

      <Modal open={showAddTool} onClose={() => setShowAddTool(false)} title="Legg til verktøy">
        <div className="form-group">
          <label className="form-label">Navn</label>
          <input
            className="form-input"
            value={newToolName}
            onChange={(e) => setNewToolName(e.target.value)}
            placeholder="F.eks. Sirkelsag"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Kategori (valgfritt)</label>
          <input
            className="form-input"
            value={newToolCategory}
            onChange={(e) => setNewToolCategory(e.target.value)}
            placeholder="F.eks. Elektroverktøy"
          />
        </div>
        <button className="btn btn-primary btn-full" onClick={handleAddTool}>
          Legg til
        </button>
      </Modal>
    </>
  );
}
