import { useState } from 'react';
import type { ToolType } from '../types';
import { useApp } from '../context';
import { Modal } from './Modal';

interface AddToolModalProps {
  open: boolean;
  categories: string[];
  onClose: () => void;
}

export function AddToolModal({ open, categories, onClose }: AddToolModalProps) {
  const { addTool } = useApp();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [type, setType] = useState<ToolType>('basis');

  const close = () => {
    setName('');
    setCategory('');
    setCustomCategory('');
    setType('basis');
    onClose();
  };

  const handleAdd = () => {
    const finalCategory = category === '__new__' ? customCategory.trim() : category;
    if (!name.trim() || !finalCategory) return;
    addTool(name.trim(), finalCategory, type);
    close();
  };

  return (
    <Modal open={open} onClose={close} title="Legg til verktøy">
      <div className="form-group">
        <label className="form-label">Navn *</label>
        <input
          className="form-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="F.eks. Sirkelsag"
        />
      </div>
      <div className="form-group">
        <label className="form-label">Kategori *</label>
        <select className="form-input" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Velg kategori...</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
          <option value="__new__">+ Ny kategori</option>
        </select>
      </div>
      {category === '__new__' && (
        <div className="form-group">
          <label className="form-label">Ny kategori *</label>
          <input
            className="form-input"
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            placeholder="F.eks. Elektroverktøy"
          />
        </div>
      )}
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
        onClick={handleAdd}
        disabled={!name.trim() || !category || (category === '__new__' && !customCategory.trim())}
      >
        Legg til
      </button>
    </Modal>
  );
}
