import type { House } from '../types';
import { houseLabel } from '../logic';
import { HouseBadge } from './HouseBadge';

interface HouseActionDialogProps {
  open: boolean;
  title: string;
  message: string;
  houses: House[];
  onChoose: (house: House) => void;
  onCancel: () => void;
}

export function HouseActionDialog({ open, title, message, houses, onChoose, onCancel }: HouseActionDialogProps) {
  if (!open) return null;
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <section className="house-action-dialog" role="dialog" aria-modal="true" aria-labelledby="house-action-title" onClick={(event) => event.stopPropagation()}>
        <header>
          <div><h2 id="house-action-title">{title}</h2><p>{message}</p></div>
          <button className="icon-button" onClick={onCancel} aria-label="Lukk">×</button>
        </header>
        <div className="house-action-options">
          {houses.map((house) => (
            <button key={house} onClick={() => onChoose(house)}>
              <HouseBadge house={house} size={40} />
              <span><strong>{houseLabel(house)}</strong><small>Velg denne adressen</small></span>
              <b aria-hidden="true">›</b>
            </button>
          ))}
        </div>
        <footer><button className="secondary-button" onClick={onCancel}>Avbryt</button></footer>
      </section>
    </div>
  );
}
