import { useState } from 'react';
import type { Tool, House, ToolType } from '../types';
import { useApp } from '../context';
import { HOUSES, derivedNeed, houseLabel } from '../logic';
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
  const [imageUrl, setImageUrl] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const commitName = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== tool.name) updateTool(tool.id, { name: trimmed });
    else setName(tool.name);
  };

  const setCount = (house: House, delta: number) => {
    const next = Math.max(0, tool.counts[house] + delta);
    updateTool(tool.id, { counts: { ...tool.counts, [house]: next } });
  };

  const setOverride = (house: House, value: number | null) => {
    updateTool(tool.id, { needOverride: { ...tool.needOverride, [house]: value } });
  };

  const setType = (type: ToolType) => updateTool(tool.id, { type });

  const removeImage = (index: number) => {
    updateTool(tool.id, { images: tool.images.filter((_, i) => i !== index) });
  };

  const addImage = () => {
    const url = imageUrl.trim();
    if (!url) return;
    updateTool(tool.id, { images: [...tool.images, url] });
    setImageUrl('');
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

        {HOUSES.map((house) => {
          const auto = derivedNeed(tool, house);
          const override = tool.needOverride[house];
          return (
            <div className="house-edit-row" key={house}>
              <div className="house-edit-label">
                <HouseBadge house={house} size={28} />
                <span>{houseLabel(house)}</span>
              </div>
              <div className="house-edit-controls">
                <div className="stepper-block">
                  <span className="stepper-label">Beholdning</span>
                  <div className="stepper">
                    <button onClick={() => setCount(house, -1)} disabled={tool.counts[house] === 0}>−</button>
                    <span className="stepper-value">{tool.counts[house]}</span>
                    <button onClick={() => setCount(house, 1)}>+</button>
                  </div>
                </div>
                <div className="stepper-block">
                  <span className="stepper-label">Behov</span>
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
              </div>
            </div>
          );
        })}

        <div className="form-group">
          <label className="form-label">Bilder</label>
          {tool.images.length > 0 && (
            <div className="image-list">
              {tool.images.map((src, i) => (
                <div className="image-item" key={`${src}-${i}`}>
                  <img src={src} alt="" />
                  <button className="image-remove" onClick={() => removeImage(i)} aria-label="Fjern bilde">×</button>
                </div>
              ))}
            </div>
          )}
          <div className="inline-row">
            <input
              className="form-input"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addImage()}
              placeholder="Lim inn bilde-URL"
            />
            <button className="btn btn-primary" onClick={addImage} disabled={!imageUrl.trim()}>
              Legg til
            </button>
          </div>
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
