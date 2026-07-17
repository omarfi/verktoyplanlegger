import { useState } from 'react';
import type { Tool, ToolType } from '../types';
import type { MergeMeta } from '../context';
import { Modal } from './Modal';

interface MergeDialogProps {
  open: boolean;
  tools: Tool[];
  categories: string[];
  onClose: () => void;
  onConfirm: (meta: MergeMeta) => void;
}

export function MergeDialog({ open, tools, categories, onClose, onConfirm }: MergeDialogProps) {
  const first = tools[0];
  const [name, setName] = useState(first?.name ?? '');
  const [category, setCategory] = useState(first?.category ?? '');
  const [type, setType] = useState<ToolType>(
    tools.some((t) => t.type === 'avansert') ? 'avansert' : 'basis'
  );

  if (!first) return null;

  const totalInstances = tools.reduce((sum, t) => sum + t.instances.length, 0);

  return (
    <Modal open={open} onClose={onClose} title={`Slå sammen ${tools.length} verktøy`}>
      <p className="hint-text">
        {totalInstances} eksemplar{totalInstances === 1 ? '' : 'er'} samles under ett verktøy. De andre verktøyene slettes.
      </p>
      <div className="form-group">
        <label className="form-label">Navn *</label>
        <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Kategori *</label>
        <select className="form-input" value={category} onChange={(e) => setCategory(e.target.value)}>
          {!categories.includes(category) && category && <option value={category}>{category}</option>}
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Type</label>
        <div className="segmented">
          {(['basis', 'avansert'] as ToolType[]).map((t) => (
            <button key={t} className={`segment ${type === t ? 'active' : ''}`} onClick={() => setType(t)}>
              {t === 'basis' ? 'Basis' : 'Avansert'}
            </button>
          ))}
        </div>
      </div>
      <button
        className="btn btn-primary btn-full"
        disabled={!name.trim() || !category}
        onClick={() => onConfirm({ name: name.trim(), category, type })}
      >
        Slå sammen
      </button>
    </Modal>
  );
}
