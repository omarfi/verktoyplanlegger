import { useRef } from 'react';
import type { Tool, House } from '../types';
import { HOUSES, countAt, effectiveNeed, houseLabel } from '../logic';
import { HouseBadge } from './HouseBadge';
import { ToolImage } from './ToolImage';

interface ToolCardProps {
  tool: Tool;
  onClick: () => void;
  onLongPress: () => void;
  selectMode?: boolean;
  selected?: boolean;
  selectedHouses: House[];
  shopping?: boolean;
  onPurchased?: () => void;
}

export function ToolCard({
  tool,
  onClick,
  onLongPress,
  selectMode = false,
  selected = false,
  selectedHouses,
  shopping = false,
  onPurchased,
}: ToolCardProps) {
  const timer = useRef<number | null>(null);
  const longPressed = useRef(false);
  const ownedHouses = HOUSES
    .map((house) => ({ house, count: countAt(tool, house) }))
    .filter(({ count }) => count > 0);
  const scope = selectedHouses.length ? selectedHouses : HOUSES;
  const needs = scope
    .map((house) => ({ house, count: effectiveNeed(tool, house) }))
    .filter(({ count }) => count > 0);
  const need = needs.reduce((sum, item) => sum + item.count, 0);
  const image = tool.instances.find((instance) => instance.image)?.image || tool.image;

  const startPress = () => {
    longPressed.current = false;
    timer.current = window.setTimeout(() => {
      longPressed.current = true;
      onLongPress();
    }, 520);
  };
  const stopPress = () => {
    if (timer.current) window.clearTimeout(timer.current);
  };

  return (
    <article className={`tool-card ${selected ? 'selected' : ''}`}>
      {selectMode ? (
        <span className="select-check" aria-hidden="true">{selected ? '✓' : ''}</span>
      ) : null}
      <button
        className="tool-card-hit"
        onPointerDown={startPress}
        onPointerUp={stopPress}
        onPointerCancel={stopPress}
        onPointerLeave={stopPress}
        onClick={() => {
          if (!longPressed.current) onClick();
          longPressed.current = false;
        }}
        aria-label={`${selectMode ? (selected ? 'Fjern' : 'Velg') : 'Åpne'} ${tool.name}`}
      >
        <div className="tool-card-image"><ToolImage src={image} alt="" /></div>
        <div className="ownership-badges" aria-label={ownedHouses.length ? 'Beholdning hos registrerte eiere' : 'Ingen har den'}>
          {ownedHouses.map(({ house, count }) => (
            <span className="ownership-badge" key={house} aria-label={`${count} stk hos ${houseLabel(house)}`}>
              <HouseBadge house={house} size={44} />
              <span className="ownership-count" aria-hidden="true">{count}</span>
            </span>
          ))}
        </div>
        <div className="tool-card-copy">
          <h3>{tool.name}</h3>
          {tool.type === 'avansert' && <span className="tool-type-tag">Avansert</span>}
          {needs.length > 0 && (
            <div className="tool-need-list">
              {needs.map(({ house, count }) => <strong key={house}>Kjøp {count} stk til {houseLabel(house)}</strong>)}
            </div>
          )}
        </div>
      </button>
      {shopping && need > 0 && onPurchased && (
        <button className="purchased-button" onClick={onPurchased}>Kjøpt ✓</button>
      )}
    </article>
  );
}
