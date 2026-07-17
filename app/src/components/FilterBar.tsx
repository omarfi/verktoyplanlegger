import type { Tool } from '../types';
import { matchesFilter, houseLabel, type Filter, type HouseFilter, type StatusFilter } from '../logic';
import { HouseBadge } from './HouseBadge';

const HOUSE_OPTIONS: HouseFilter[] = ['begge', 'osterliveien', 'raschsvei'];
const STATUS_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: 'alle', label: 'Alle' },
  { key: 'mangler', label: 'Mangler' },
  { key: 'trenger', label: 'Trenger' },
  { key: 'har', label: 'Har' },
];

interface FilterBarProps {
  filter: Filter;
  onChange: (filter: Filter) => void;
  tools: Tool[];
}

export function FilterBar({ filter, onChange, tools }: FilterBarProps) {
  const countFor = (status: StatusFilter) =>
    tools.filter((t) => matchesFilter(t, { house: filter.house, status })).length;

  return (
    <div className="filter-bar">
      <div className="segmented" role="group" aria-label="Hus">
        {HOUSE_OPTIONS.map((house) => (
          <button
            key={house}
            className={`segment ${filter.house === house ? 'active' : ''}`}
            onClick={() => onChange({ ...filter, house })}
          >
            {house === 'begge' ? (
              'Begge'
            ) : (
              <>
                <HouseBadge house={house} size={18} />
                {houseLabel(house)}
              </>
            )}
          </button>
        ))}
      </div>
      <div className="segmented" role="group" aria-label="Status">
        {STATUS_OPTIONS.map(({ key, label }) => (
          <button
            key={key}
            className={`segment ${filter.status === key ? 'active' : ''}`}
            onClick={() => onChange({ ...filter, status: key })}
          >
            {label}
            <span className="segment-count">{countFor(key)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
