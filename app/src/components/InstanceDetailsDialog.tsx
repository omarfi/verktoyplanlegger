import { useState } from 'react';
import type { House } from '../types';
import { houseLabel } from '../logic';
import { HouseBadge } from './HouseBadge';
import { ToolImage } from './ToolImage';

interface InstanceDetailsDialogProps {
  open: boolean;
  toolName: string;
  fixedHouse?: House | null;
  houseOptions?: House[];
  confirmLabel?: string;
  initialLabel?: string;
  initialImage?: string;
  onConfirm: (details: { house: House; label: string; image: string }) => void;
  onCancel: () => void;
}

export function InstanceDetailsDialog({
  open,
  toolName,
  fixedHouse = null,
  houseOptions = [],
  confirmLabel = 'Legg til i beholdning',
  initialLabel = '',
  initialImage = '',
  onConfirm,
  onCancel,
}: InstanceDetailsDialogProps) {
  const [house, setHouse] = useState<House | null>(fixedHouse);
  const [label, setLabel] = useState(initialLabel);
  const [image, setImage] = useState(initialImage);

  if (!open) return null;

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <section className="instance-details-dialog" role="dialog" aria-modal="true" aria-labelledby="instance-details-title" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <h2 id="instance-details-title">Legg til {toolName}</h2>
            <p>Registrer detaljer for det nye eksemplaret.</p>
          </div>
          <button className="icon-button" onClick={onCancel} aria-label="Lukk">×</button>
        </header>

        {!fixedHouse && (
          <fieldset className="instance-house-fieldset">
            <legend>Hvilken adresse gjelder handlingen?</legend>
            <div className="instance-house-options">
              {houseOptions.map((option) => (
                <button
                  type="button"
                  className="instance-house-option"
                  aria-pressed={house === option}
                  key={option}
                  onClick={() => setHouse(option)}
                >
                  <HouseBadge house={option} size={36} />
                  <span>{houseLabel(option)}</span>
                  <b aria-hidden="true">{house === option ? '✓' : ''}</b>
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {fixedHouse && (
          <div className="instance-fixed-house">
            <HouseBadge house={fixedHouse} size={34} />
            <span><small>Legges til i beholdningen hos</small><strong>{houseLabel(fixedHouse)}</strong></span>
          </div>
        )}

        <div className="field">
          <label htmlFor="new-instance-label">Kjennetegn <small>(valgfritt)</small></label>
          <input
            id="new-instance-label"
            className="form-input"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="F.eks. blått håndtak eller Bosch"
            autoFocus={Boolean(fixedHouse)}
          />
        </div>

        <div className="field">
          <label htmlFor="new-instance-image">Bilde-URL <small>(valgfritt)</small></label>
          <input
            id="new-instance-image"
            className="form-input"
            type="url"
            value={image}
            onChange={(event) => setImage(event.target.value)}
            placeholder="https://…"
          />
          {image.trim() && <div className="instance-image-preview"><ToolImage src={image.trim()} alt="Forhåndsvisning av eksemplaret" /></div>}
        </div>

        <footer>
          <button className="secondary-button" onClick={onCancel}>Avbryt</button>
          <button
            className="primary-button"
            disabled={!house}
            onClick={() => house && onConfirm({ house, label: label.trim(), image: image.trim() })}
          >{confirmLabel}</button>
        </footer>
      </section>
    </div>
  );
}
