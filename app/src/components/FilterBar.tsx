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
  const toggleHouse = (house: House) => {
    onHousesChange(houses.includes(house) ? houses.filter((item) => item !== house) : [...houses, house]);
  };

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
      <div className="house-toggles" aria-label="Velg person eller hus">
        {HOUSES.map((house) => {
          const active = houses.includes(house);
          return (
            <button
              key={house}
              className="house-toggle"
              aria-pressed={active}
              aria-label={`${active ? 'Fjern' : 'Vis'} ${housePerson(house)}`}
              onClick={() => toggleHouse(house)}
            >
              <HouseBadge house={house} size={32} />
              <span>{housePerson(house)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
