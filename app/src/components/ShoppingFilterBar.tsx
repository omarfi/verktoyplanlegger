import type { ShoppingFilter } from '../logic';

interface ShoppingFilterBarProps {
  value: ShoppingFilter;
  counts: Record<ShoppingFilter, number>;
  onChange: (value: ShoppingFilter) => void;
}

const FILTERS: { key: ShoppingFilter; label: string }[] = [
  { key: 'alle', label: 'Alt' },
  { key: 'kjop', label: 'Kjøp' },
  { key: 'flytt', label: 'Flytt' },
];

export function ShoppingFilterBar({ value, counts, onChange }: ShoppingFilterBarProps) {
  return (
    <div className="shopping-filter" role="tablist" aria-label="Filtrer handlelisten">
      {FILTERS.map((item) => (
        <button
          key={item.key}
          className="shopping-filter-chip"
          role="tab"
          aria-selected={value === item.key}
          onClick={() => onChange(item.key)}
        >
          {item.label}
          <span className="shopping-filter-count">{counts[item.key]}</span>
        </button>
      ))}
    </div>
  );
}
