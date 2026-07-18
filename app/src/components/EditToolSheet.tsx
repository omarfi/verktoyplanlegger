import { useMemo, useState } from 'react';
import type { Tool, ToolInstance, House, ToolType } from '../types';
import { useApp, useAuth } from '../context';
import { HOUSES, countAt, derivedNeed, effectiveNeed, generateId, houseLabel, housePerson, otherHouse, pendingMoveCount } from '../logic';
import { HouseBadge } from './HouseBadge';
import { ConfirmDialog } from './Modal';
import { ToolGlyph, ToolImage } from './ToolImage';

interface EditToolSheetProps {
  tool: Tool;
  categories: string[];
  currentHouse: House;
  onClose: () => void;
  notify: (message: string, undo?: () => void) => void;
}

interface MoveDialogProps {
  instance: ToolInstance | null;
  toolName: string;
  onPlan: () => void;
  onComplete: () => void;
  onCancel: () => void;
}

function MoveDialog({ instance, toolName, onPlan, onComplete, onCancel }: MoveDialogProps) {
  if (!instance) return null;
  const destination = otherHouse(instance.location);
  return (
    <div className="confirm-overlay" onClick={(event) => { event.stopPropagation(); onCancel(); }}>
      <section className="move-dialog" role="dialog" aria-modal="true" aria-labelledby="move-dialog-title" onClick={(event) => event.stopPropagation()}>
        <h2 id="move-dialog-title">Flytt {instance.label || toolName}</h2>
        <p>Er eksemplaret allerede flyttet til {houseLabel(destination)}, eller skal flyttingen bare markeres som en oppgave?</p>
        <div className="move-dialog-actions">
          <button className="secondary-button" onClick={onCancel}>Avbryt</button>
          <button className="secondary-button" onClick={onPlan}>Skal flyttes</button>
          <button className="primary-button" onClick={onComplete}>Allerede flyttet</button>
        </div>
      </section>
    </div>
  );
}

export function EditToolSheet({ tool, categories, currentHouse, onClose, notify }: EditToolSheetProps) {
  const { updateTool, putTool, deleteTool } = useApp();
  const { user, signIn, currentHouse: authHouse } = useAuth();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Tool>(() => structuredClone(tool));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [instanceMenu, setInstanceMenu] = useState<string | null>(null);
  const [moveCandidate, setMoveCandidate] = useState<ToolInstance | null>(null);
  const [imageBroken, setImageBroken] = useState(false);

  const heroImage = tool.image || tool.instances.find((instance) => instance.image)?.image || '';
  const categoryOptions = useMemo(() => [...new Set([...categories, draft.category])], [categories, draft.category]);

  const requireWrite = async (action: () => void) => {
    if (user && authHouse) {
      action();
      return;
    }
    if (await signIn()) action();
  };

  const patchInstance = (id: string, patch: Partial<ToolInstance>) => {
    setDraft((current) => ({
      ...current,
      instances: current.instances.map((instance) => instance.id === id ? { ...instance, ...patch } : instance),
    }));
  };

  const mutateTool = (updates: Partial<Tool>, message: string) => {
    void requireWrite(() => {
      const before = structuredClone(tool);
      updateTool(tool.id, updates);
      notify(message, () => putTool(before));
    });
  };

  const completeMove = (instance: ToolInstance) => {
    const destination = instance.moveTo ?? otherHouse(instance.location);
    const override = tool.needOverride[destination];
    mutateTool(
      {
        instances: tool.instances.map((item) => item.id === instance.id ? { ...item, location: destination, moveTo: null } : item),
        needOverride: {
          ...tool.needOverride,
          [destination]: typeof override === 'number' && override > 0 ? Math.max(0, override - 1) : override,
        },
      },
      `${instance.label || tool.name} er flyttet til ${houseLabel(destination)}`
    );
    setInstanceMenu(null);
    setMoveCandidate(null);
  };

  const planMove = (instance: ToolInstance) => {
    const destination = otherHouse(instance.location);
    mutateTool(
      { instances: tool.instances.map((item) => item.id === instance.id ? { ...item, moveTo: destination } : item) },
      `${instance.label || tool.name} er markert for flytting til ${houseLabel(destination)}`
    );
    setInstanceMenu(null);
    setMoveCandidate(null);
  };

  const cancelMove = (instance: ToolInstance) => {
    mutateTool(
      { instances: tool.instances.map((item) => item.id === instance.id ? { ...item, moveTo: null } : item) },
      'Den planlagte flyttingen er fjernet'
    );
    setInstanceMenu(null);
  };

  const removeInstance = (instance: ToolInstance) => {
    mutateTool({ instances: tool.instances.filter((item) => item.id !== instance.id) }, 'Eksemplaret er slettet');
    setInstanceMenu(null);
  };

  const saveDraft = () => {
    const trimmed = draft.name.trim();
    if (!trimmed) return;
    void requireWrite(() => {
      const before = structuredClone(tool);
      updateTool(tool.id, { ...draft, name: trimmed });
      setEditing(false);
      notify('Endringene er lagret', () => putTool(before));
    });
  };

  const startEditing = () => {
    void requireWrite(() => {
      setDraft(structuredClone(tool));
      setEditing(true);
    });
  };

  const requestDelete = () => {
    void requireWrite(() => {
      if (tool.instances.length) {
        setConfirmDelete(true);
        return;
      }
      const before = structuredClone(tool);
      deleteTool(tool.id);
      onClose();
      notify(`${tool.name} er slettet`, () => putTool(before));
    });
  };

  const confirmToolDelete = () => {
    void requireWrite(() => {
      const before = structuredClone(tool);
      setConfirmDelete(false);
      deleteTool(tool.id);
      onClose();
      notify(`${tool.name} og ${tool.instances.length} eksemplarer er slettet`, () => putTool(before));
    });
  };

  const pasteImage = async () => {
    try {
      const value = await navigator.clipboard.readText();
      setDraft((current) => ({ ...current, image: value }));
      setImageBroken(false);
    } catch {
      // Manuell innliming er fortsatt mulig.
    }
  };

  if (editing) {
    return (
      <div className="sheet-overlay" onClick={onClose}>
        <section className="detail-sheet" role="dialog" aria-modal="true" aria-labelledby="edit-sheet-title" onClick={(event) => event.stopPropagation()}>
          <div className="sheet-grabber" />
          <header className="detail-sheet-header">
            <div><h2 id="edit-sheet-title">Rediger {tool.name}</h2><p>Endringer lagres samlet, ikke per tastetrykk</p></div>
            <button className="icon-button" onClick={onClose} aria-label="Lukk">×</button>
          </header>
          <div className="form-stack detail-sheet-body">
            <div className="field"><label htmlFor="edit-name">Navn</label><input id="edit-name" className="form-input" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></div>
            <div className="two-fields">
              <div className="field"><label htmlFor="edit-category">Kategori</label><select id="edit-category" className="form-input" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>{categoryOptions.map((category) => <option key={category}>{category}</option>)}</select></div>
              <div className="field"><label htmlFor="edit-type">Type</label><select id="edit-type" className="form-input" value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as ToolType })}><option value="basis">Grunnleggende</option><option value="avansert">Avansert</option></select></div>
            </div>
            <div className="field">
              <label htmlFor="edit-image">Bilde-URL</label>
              <div className="input-action"><input id="edit-image" className="form-input" type="url" value={draft.image} onChange={(event) => { setDraft({ ...draft, image: event.target.value }); setImageBroken(false); }} placeholder="https://…" /><button className="text-button" onClick={pasteImage}>Lim inn</button></div>
              <small>Bruk en direkte produkt- eller bilde-URL.</small>
              <div className={`url-preview ${imageBroken ? 'broken' : ''}`}>{draft.image ? <img src={draft.image} alt="Forhåndsvisning" referrerPolicy="no-referrer" onError={() => setImageBroken(true)} /> : <span>Forhåndsvisning vises her</span>}{imageBroken && <span>Bildet kunne ikke lastes. Kontroller URL-en.</span>}</div>
            </div>
            <div className="field"><label htmlFor="edit-notes">Notater</label><textarea id="edit-notes" className="form-input" value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></div>

            <section className="detail-section">
              <h3>Hvem har den?</h3>
              <div className="instance-editors">
                {draft.instances.map((instance, index) => (
                  <div className="instance-editor" key={instance.id}>
                    <div className="instance-editor-title"><HouseBadge house={instance.location} size={30} /><strong>Eksemplar {index + 1}</strong><button className="danger-text-button" onClick={() => setDraft({ ...draft, instances: draft.instances.filter((item) => item.id !== instance.id) })}>Fjern</button></div>
                    <div className="two-fields">
                      <div className="field"><label>Kjennetegn</label><input className="form-input" value={instance.label} onChange={(event) => patchInstance(instance.id, { label: event.target.value })} placeholder="F.eks. blått håndtak" /></div>
                      <div className="field"><label>Hvor er den?</label><select className="form-input" value={instance.location} onChange={(event) => patchInstance(instance.id, { location: event.target.value as House, moveTo: null })}>{HOUSES.map((house) => <option key={house} value={house}>{houseLabel(house)}</option>)}</select></div>
                    </div>
                    <div className="field"><label>Bilde-URL</label><input className="form-input" type="url" value={instance.image} onChange={(event) => patchInstance(instance.id, { image: event.target.value })} placeholder="https://…" /></div>
                  </div>
                ))}
              </div>
              <button className="secondary-button" onClick={() => setDraft({ ...draft, instances: [...draft.instances, { id: generateId(), location: currentHouse, image: '', label: '' }] })}>+ Legg til eksemplar</button>
            </section>

            <section className="detail-section">
              <h3>Skal den kjøpes?</h3>
              <div className="need-editor">
                {HOUSES.map((house) => {
                  const amount = effectiveNeed(draft, house);
                  const overridden = draft.needOverride[house] !== null;
                  const setOverride = (value: number | null) => setDraft({ ...draft, needOverride: { ...draft.needOverride, [house]: value } });
                  return (
                    <div className="need-question" key={house}>
                      <HouseBadge house={house} size={32} /><span>Kjøpes til {houseLabel(house)}?</span>
                      <label className="switch"><input type="checkbox" checked={amount > 0} onChange={(event) => setOverride(event.target.checked ? Math.max(1, derivedNeed(draft, house)) : 0)} /><span /></label>
                      {amount > 0 && <div className="stepper"><button onClick={() => setOverride(Math.max(1, amount - 1))}>−</button><output>{amount}</output><button onClick={() => setOverride(amount + 1)}>+</button></div>}
                      {overridden && <button className="text-button" onClick={() => setOverride(null)}>Bruk standard</button>}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="detail-section danger-zone"><button className="danger-text-button" onClick={requestDelete}>Slett hele verktøyet</button></section>
          </div>
          <footer className="sheet-actions"><button className="secondary-button" onClick={() => { setDraft(structuredClone(tool)); setEditing(false); }}>Avbryt</button><button className="primary-button" onClick={saveDraft} disabled={!draft.name.trim()}>Lagre endringer</button></footer>
          <ConfirmDialog open={confirmDelete} title="Slett hele verktøyet" message={`Dette sletter «${tool.name}» og ${tool.instances.length} registrerte eksemplarer.`} confirmLabel="Ja, slett" onConfirm={confirmToolDelete} onCancel={() => setConfirmDelete(false)} />
        </section>
      </div>
    );
  }

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <section className="detail-sheet" role="dialog" aria-modal="true" aria-labelledby="detail-sheet-title" onClick={(event) => event.stopPropagation()}>
        <div className="sheet-grabber" />
        <header className="detail-sheet-header">
          <div><h2 id="detail-sheet-title">{tool.name}</h2><p>{tool.category} · {tool.type === 'avansert' ? 'Avansert' : 'Grunnleggende'}</p></div>
          <button className="icon-button" onClick={startEditing} aria-label={`Rediger ${tool.name}`}>✎</button>
          <button className="icon-button" onClick={onClose} aria-label="Lukk">×</button>
        </header>
        <div className="detail-sheet-body">
          <div className="detail-hero">{heroImage ? <ToolImage src={heroImage} alt={tool.name} /> : <ToolGlyph size={68} />}</div>
          <section className="detail-section">
            <h3>Har vi den?</h3>
            <div className="plain-status">
              {HOUSES.map((house) => {
                const count = countAt(tool, house);
                const need = effectiveNeed(tool, house);
                const moving = pendingMoveCount(tool, house);
                return (
                  <div className="status-row" key={house}>
                    <HouseBadge house={house} size={34} />
                    <span><strong>{houseLabel(house)}</strong><small>{count ? `${count} ${count === 1 ? 'eksemplar' : 'eksemplarer'}` : 'Ingen registrert'}{tool.needOverride[house] !== null ? ' · tilpasset behov' : ''}</small></span>
                    {moving ? <b className="move-tag">Flytt {moving > 1 ? moving : ''}</b> : need ? <b className="need-tag">Kjøp {need}</b> : <b className="covered-tag">{count ? 'På plass ✓' : 'Ikke nødvendig'}</b>}
                    {!need && !count && tool.type === 'avansert' && house === 'osterliveien' && <button className="text-button" onClick={() => mutateTool({ needOverride: { ...tool.needOverride, [house]: 1 } }, `${tool.name} er lagt på handlelisten`)}>+ Handleliste</button>}
                  </div>
                );
              })}
            </div>
            {tool.type === 'avansert' && <p className="policy-note">Avanserte verktøy trengs normalt bare i Raschs Vei. Dette kan tilpasses per hus i redigering.</p>}
          </section>
          {tool.notes && <section className="detail-section"><h3>Notater</h3><p className="notes-copy">{tool.notes}</p></section>}
          <section className="detail-section">
            <h3>Hvem har den? · {tool.instances.length}</h3>
            {tool.instances.length ? (
              <div className="instance-grid">
                {tool.instances.map((instance) => (
                  <article className="instance-card" key={instance.id}>
                    <div className="instance-image"><ToolImage src={instance.image} alt="" /></div>
                    <div className="instance-copy"><strong>{instance.label || tool.name}</strong><small>{houseLabel(instance.location)}{instance.moveTo ? ` → skal flyttes til ${houseLabel(instance.moveTo)}` : ''}</small></div>
                    <button className="instance-menu-button" onClick={() => setInstanceMenu(instanceMenu === instance.id ? null : instance.id)} aria-label={`Handlinger for ${instance.label || tool.name}`}>•••</button>
                    {instanceMenu === instance.id && <div className="instance-popover">
                      {instance.moveTo ? (
                        <>
                          <button onClick={() => completeMove(instance)}>Marker som flyttet til {houseLabel(instance.moveTo!)}</button>
                          <button onClick={() => cancelMove(instance)}>Avbryt planlagt flytting</button>
                        </>
                      ) : <button onClick={() => { setMoveCandidate(instance); setInstanceMenu(null); }}>Flytt til {houseLabel(otherHouse(instance.location))}</button>}
                      <button onClick={() => { startEditing(); setInstanceMenu(null); }}>Rediger eksemplar</button>
                      <button className="danger" onClick={() => removeInstance(instance)}>Slett eksemplar</button>
                    </div>}
                  </article>
                ))}
              </div>
            ) : <p className="hint-text">Ingen eksemplarer er registrert ennå.</p>}
          </section>
          <button className="primary-button full-button detail-edit-button" onClick={startEditing}>Rediger verktøy</button>
          <p className="detail-owner-note">Nye eksemplarer plasseres hos {housePerson(currentHouse)} som standard.</p>
        </div>
        <MoveDialog instance={moveCandidate} toolName={tool.name} onPlan={() => moveCandidate && planMove(moveCandidate)} onComplete={() => moveCandidate && completeMove(moveCandidate)} onCancel={() => setMoveCandidate(null)} />
      </section>
    </div>
  );
}
