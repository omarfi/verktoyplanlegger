import type { House } from '../types';
import type { ViewIntent } from '../logic';
import { HOUSES, housePerson } from '../logic';
import { HouseBadge } from './HouseBadge';

interface FilterBarProps {
  intent: ViewIntent;
  houses: House[];
  onIntentChange: (intent: ViewIntent) => void;
  onHousesChange: (houses: House[]) => void;
}

const INTENTS: { key: ViewIntent; label: string }[] = [
  { key: 'alle', label: 'Alle' },
  { key: 'handleliste', label: 'Handleliste' },
  { key: 'har', label: 'Har' },
];

export function FilterBar({ intent, houses, onIntentChange, onHousesChange }: FilterBarProps) {
  // «Begge» er lik tomt utvalg (ingen husfilter); ellers er nøyaktig ett hus valgt om gangen.
  const activeHouse: House | null = houses.length === 1 ? houses[0] : null;

  return (
    <div className="filter-row">
      <div className="intent-segments" role="tablist" aria-label="Hva vil du se?">
        {INTENTS.map((item) => (
          <button
            key={item.key}
            className="intent-segment"
            role="tab"
            aria-selected={intent === item.key}
            onClick={() => onIntentChange(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="house-segments" role="tablist" aria-label="Velg person eller hus">
        <button
          className="house-segment"
          role="tab"
          aria-selected={activeHouse === null}
          onClick={() => onHousesChange([])}
        >
          Begge
        </button>
        {HOUSES.map((house) => (
          <button
            key={house}
            className="house-segment"
            role="tab"
            aria-selected={activeHouse === house}
            onClick={() => onHousesChange([house])}
          >
            <HouseBadge house={house} size={20} />
            {housePerson(house)}
          </button>
        ))}
      </div>
    </div>
  );
}
