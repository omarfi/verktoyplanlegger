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
  const [survivorId, setSurvivorId] = useState(first?.id ?? '');
  const survivor = tools.find((tool) => tool.id === survivorId) ?? first;
  const [name, setName] = useState(first?.name ?? '');
  const [category, setCategory] = useState(first?.category ?? '');
  const [type, setType] = useState<ToolType>(first?.type ?? 'basis');

  if (!first || !survivor) return null;

  const selectSurvivor = (tool: Tool) => {
    setSurvivorId(tool.id);
    setName(tool.name);
    setCategory(tool.category);
    setType(tool.type);
  };

  return (
    <Modal open={open} onClose={onClose} title="Slå sammen" subtitle={`${tools.length} verktøy valgt`}>
      <p className="body-copy">Velg navnet og kategorien som skal beholdes. Alle bilder, notater, eksemplarer og behov fra de andre verktøyene blir tatt vare på.</p>
      <div className="merge-options">
        {tools.map((tool) => (
          <label key={tool.id} className="merge-option">
            <input type="radio" checked={survivorId === tool.id} onChange={() => selectSurvivor(tool)} />
            <span><strong>{tool.name}</strong><small>{tool.instances.length} {tool.instances.length === 1 ? 'eksemplar' : 'eksemplarer'} · {tool.category}</small></span>
          </label>
        ))}
      </div>
      <div className="field"><label htmlFor="merge-name">Navn</label><input id="merge-name" className="form-input" value={name} onChange={(event) => setName(event.target.value)} /></div>
      <div className="two-fields">
        <div className="field"><label htmlFor="merge-category">Kategori</label><select id="merge-category" className="form-input" value={category} onChange={(event) => setCategory(event.target.value)}>{[...new Set([...categories, category])].map((item) => <option key={item}>{item}</option>)}</select></div>
        <div className="field"><label htmlFor="merge-type">Type</label><select id="merge-type" className="form-input" value={type} onChange={(event) => setType(event.target.value as ToolType)}><option value="basis">Grunnleggende</option><option value="avansert">Avansert</option></select></div>
      </div>
      <p className="info-box">Ingen felt går tapt. Sammenslåingen kan angres fra meldingen etterpå.</p>
      <button className="primary-button full-button" disabled={!name.trim() || !category} onClick={() => onConfirm({ survivorId, name: name.trim(), category, type })}>Slå sammen {tools.length} verktøy</button>
    </Modal>
  );
}
