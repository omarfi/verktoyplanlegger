import { useState } from 'react';
import type { Tool, ToolInstance, House, ToolType } from '../types';
import { useApp } from '../context';
import { HOUSES, countAt, derivedNeed, houseLabel, generateId } from '../logic';
import { HouseBadge } from './HouseBadge';
import { ConfirmDialog } from './Modal';

interface EditToolSheetProps {
  tool: Tool;
  categories: string[];
  onClose: () => void;
}

export function EditToolSheet({ tool, categories, onClose }: EditToolSheetProps) {
  const { updateTool, deleteTool } = useApp();
  const [name, setName] = useState(tool.name);
  const [newCategory, setNewCategory] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const commitName = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== tool.name) updateTool(tool.id, { name: trimmed });
    else setName(tool.name);
  };

  const setType = (type: ToolType) => updateTool(tool.id, { type });

  const updateInstances = (instances: ToolInstance[]) => updateTool(tool.id, { instances });

  const addInstance = () => {
    updateInstances([...tool.instances, { id: generateId(), location: 'raschsvei', image: '', label: '' }]);
  };

  const patchInstance = (id: string, patch: Partial<ToolInstance>) => {
    updateInstances(tool.instances.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };

  const removeInstance = (id: string) => {
    updateInstances(tool.instances.filter((i) => i.id !== id));
  };

  const setOverride = (house: House, value: number | null) => {
    updateTool(tool.id, { needOverride: { ...tool.needOverride, [house]: value } });
  };

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="edit-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <input
            className="sheet-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            aria-label="Navn"
          />
          <button className="sheet-close" onClick={onClose} aria-label="Lukk">×</button>
        </div>

        <div className="form-group">
          <label className="form-label">Kategori</label>
          <select
            className="form-input"
            value={newCategory !== null ? '__new__' : tool.category}
            onChange={(e) => {
              if (e.target.value === '__new__') setNewCategory('');
              else {
                setNewCategory(null);
                updateTool(tool.id, { category: e.target.value });
              }
            }}
          >
            {!categories.includes(tool.category) && <option value={tool.category}>{tool.category}</option>}
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
            <option value="__new__">+ Ny kategori</option>
          </select>
          {newCategory !== null && (
            <div className="inline-row">
              <input
                className="form-input"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Navn på ny kategori"
              />
              <button
                className="btn btn-primary"
                disabled={!newCategory.trim()}
                onClick={() => {
                  updateTool(tool.id, { category: newCategory.trim() });
                  setNewCategory(null);
                }}
              >
                Lagre
              </button>
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Type</label>
          <div className="segmented">
            {(['basis', 'avansert'] as ToolType[]).map((type) => (
              <button
                key={type}
                className={`segment ${tool.type === type ? 'active' : ''}`}
                onClick={() => setType(type)}
              >
                {type === 'basis' ? 'Basis' : 'Avansert'}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Generell thumbnail</label>
          <div className="inline-row">
            <div className="instance-thumb">
              {tool.image ? (
                <img src={tool.image} alt="" referrerPolicy="no-referrer" />
              ) : (
                <span className="instance-thumb-empty">?</span>
              )}
            </div>
            <input
              className="form-input"
              value={tool.image}
              onChange={(e) => updateTool(tool.id, { image: e.target.value })}
              placeholder="Bilde-URL (valgfritt, uavhengig av eksemplarer)"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            Eksemplarer ({HOUSES.map((h) => `${houseLabel(h)}: ${countAt(tool, h)}`).join(' · ')})
          </label>
          {tool.instances.length === 0 && (
            <p className="hint-text">Ingen eksemplarer registrert ennå.</p>
          )}
          {tool.instances.map((inst) => (
            <div className="instance-row" key={inst.id}>
              <div className="instance-thumb">
                {inst.image ? (
                  <img src={inst.image} alt="" referrerPolicy="no-referrer" />
                ) : (
                  <span className="instance-thumb-empty">?</span>
                )}
              </div>
              <div className="instance-fields">
                <input
                  className="form-input"
                  value={inst.label}
                  onChange={(e) => patchInstance(inst.id, { label: e.target.value })}
                  placeholder="Merke / variant (valgfritt)"
                />
                <input
                  className="form-input"
                  value={inst.image}
                  onChange={(e) => patchInstance(inst.id, { image: e.target.value })}
                  placeholder="Bilde-URL"
                />
                <div className="segmented instance-location">
                  {HOUSES.map((house) => (
                    <button
                      key={house}
                      className={`segment ${inst.location === house ? 'active' : ''}`}
                      onClick={() => patchInstance(inst.id, { location: house })}
                    >
                      <HouseBadge house={house} size={16} />
                      {houseLabel(house)}
                    </button>
                  ))}
                </div>
              </div>
              <button className="instance-remove" onClick={() => removeInstance(inst.id)} aria-label="Fjern eksemplar">×</button>
            </div>
          ))}
          <button className="btn btn-ghost btn-full add-instance-btn" onClick={addInstance}>
            + Legg til eksemplar
          </button>
        </div>

        <div className="form-group">
          <label className="form-label">Behov</label>
          {HOUSES.map((house) => {
            const auto = derivedNeed(tool, house);
            const override = tool.needOverride[house];
            return (
              <div className="need-row" key={house}>
                <div className="need-row-label">
                  <HouseBadge house={house} size={24} />
                  <span>{houseLabel(house)}</span>
                </div>
                {override === null ? (
                  <div className="need-auto">
                    <span className="need-auto-value">{auto} <em>(auto)</em></span>
                    <button className="btn-link" onClick={() => setOverride(house, auto)}>Overstyr</button>
                  </div>
                ) : (
                  <div className="stepper overridden">
                    <button onClick={() => setOverride(house, Math.max(0, override - 1))} disabled={override === 0}>−</button>
                    <span className="stepper-value">{override}</span>
                    <button onClick={() => setOverride(house, override + 1)}>+</button>
                    <button className="btn-link" onClick={() => setOverride(house, null)}>Auto</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button className="btn btn-danger btn-full" onClick={() => setConfirmDelete(true)}>
          Slett verktøy
        </button>

        <ConfirmDialog
          open={confirmDelete}
          title="Slett verktøy"
          message={`Er du sikker på at du vil slette «${tool.name}»?`}
          confirmLabel="Slett"
          onConfirm={() => {
            setConfirmDelete(false);
            deleteTool(tool.id);
            onClose();
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      </div>
    </div>
  );
}
