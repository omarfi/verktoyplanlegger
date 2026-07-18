import { useMemo, useState } from 'react';
import type { House, Tool, ToolType } from '../types';
import { useApp } from '../context';
import { findDuplicates, HOUSES, housePerson, suggestCategory } from '../logic';
import { Modal } from './Modal';
import { HouseBadge } from './HouseBadge';

interface AddToolModalProps {
  open: boolean;
  categories: string[];
  currentHouse: House;
  onClose: () => void;
  onAdded: (tool: Tool) => void;
  onOpenExisting: (tool: Tool) => void;
}

export function AddToolModal({ open, categories, currentHouse, onClose, onAdded, onOpenExisting }: AddToolModalProps) {
  const { addTool, tools } = useApp();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Annet');
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [type, setType] = useState<ToolType>('basis');
  const [image, setImage] = useState('');
  const [notes, setNotes] = useState('');
  const [owner, setOwner] = useState<House | null>(currentHouse);
  const [advanced, setAdvanced] = useState(false);
  const [imageBroken, setImageBroken] = useState(false);

  const reset = () => {
    setName('');
    setCategory('Annet');
    setCategoryTouched(false);
    setType('basis');
    setImage('');
    setNotes('');
    setOwner(currentHouse);
    setAdvanced(false);
    setImageBroken(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const matches = useMemo(() => findDuplicates(name, tools), [name, tools]);
  const exact = matches.find((match) => match.score === 1);
  const options = [...new Set([...categories, category, 'Annet'])];

  const handleName = (value: string) => {
    setName(value);
    if (!categoryTouched) setCategory(suggestCategory(value));
  };

  const pasteImage = async () => {
    try {
      setImage(await navigator.clipboard.readText());
      setImageBroken(false);
    } catch {
      // Feltet kan fortsatt fylles manuelt når nettleseren nekter utklippstavle.
    }
  };

  const handleAdd = () => {
    if (!name.trim() || exact) return;
    const added = addTool({
      name: name.trim(),
      category,
      type,
      image: image.trim(),
      notes: notes.trim(),
      owner,
    });
    reset();
    onAdded(added);
  };

  return (
    <Modal open={open} onClose={close} title="Legg til verktøy" subtitle={`Nytt eksemplar plasseres hos ${owner ? housePerson(owner) : 'ingen'}`}>
      <div className="form-stack">
        <div className="field">
          <label htmlFor="add-tool-name">Hva heter verktøyet?</label>
          <input
            id="add-tool-name"
            className="form-input"
            value={name}
            onChange={(event) => handleName(event.target.value)}
            placeholder="F.eks. rørtang"
            autoFocus
          />
          <small>Vi sjekker etter duplikater mens du skriver.</small>
          {matches.length > 0 && (
            <div className="duplicate-list">
              <strong>Finnes kanskje allerede:</strong>
              {matches.map(({ tool }) => (
                <button key={tool.id} onClick={() => { reset(); onOpenExisting(tool); }}>
                  <span><b>{tool.name}</b><small>{tool.category}</small></span><span>Åpne →</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="field">
          <label htmlFor="add-tool-image">Bilde-URL <small>(valgfritt)</small></label>
          <div className="input-action">
            <input id="add-tool-image" className="form-input" type="url" value={image} onChange={(event) => { setImage(event.target.value); setImageBroken(false); }} placeholder="https://…" />
            <button className="text-button" onClick={pasteImage}>Lim inn</button>
          </div>
          <div className={`url-preview ${imageBroken ? 'broken' : ''}`}>
            {image ? <img src={image} alt="Forhåndsvisning" referrerPolicy="no-referrer" onError={() => setImageBroken(true)} /> : <span>Lim inn en produkt- eller bilde-URL</span>}
            {imageBroken && <span>Bildet kunne ikke lastes. Kontroller URL-en.</span>}
          </div>
        </div>

        <div className="field">
          <span>Hvem har den?</span>
          <div className="choice-row">
            {HOUSES.map((house) => (
              <button key={house} className="choice-chip" aria-pressed={owner === house} onClick={() => setOwner(house)}>
                <HouseBadge house={house} size={32} /><span>{housePerson(house)}</span>
              </button>
            ))}
            <button className="choice-chip" aria-pressed={owner === null} onClick={() => setOwner(null)}><span className="none-avatar">–</span><span>Ingen ennå</span></button>
          </div>
        </div>

        <div className="field">
          <label htmlFor="add-tool-category">Foreslått kategori</label>
          <select id="add-tool-category" className="form-input" value={category} onChange={(event) => { setCategory(event.target.value); setCategoryTouched(true); }}>
            {options.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>

        <button className="text-button details-toggle" onClick={() => setAdvanced((value) => !value)}>{advanced ? 'Skjul flere detaljer' : 'Flere detaljer'}</button>
        {advanced && (
          <div className="advanced-panel">
            <div className="field">
              <label htmlFor="add-tool-type">Type</label>
              <select id="add-tool-type" className="form-input" value={type} onChange={(event) => setType(event.target.value as ToolType)}>
                <option value="basis">Grunnleggende</option><option value="avansert">Avansert</option>
              </select>
            </div>
            <div className="field"><label htmlFor="add-tool-notes">Notater</label><textarea id="add-tool-notes" className="form-input" value={notes} onChange={(event) => setNotes(event.target.value)} /></div>
          </div>
        )}

        {exact && <p className="field-error">Verktøyet finnes allerede. Åpne det eksisterende kortet i listen over.</p>}
        <button className="primary-button full-button" onClick={handleAdd} disabled={!name.trim() || Boolean(exact)}>Legg til verktøy</button>
      </div>
    </Modal>
  );
}
