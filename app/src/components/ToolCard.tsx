import { useRef } from 'react';
import type { Tool, House } from '../types';
import { HOUSES, countAt, effectiveNeed } from '../logic';
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
  const ownedHouses = HOUSES.filter((house) => countAt(tool, house) > 0);
  const scope = selectedHouses.length ? selectedHouses : HOUSES;
  const need = scope.reduce((sum, house) => sum + effectiveNeed(tool, house), 0);
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
      ) : tool.instances.length > 1 ? (
        <span className="count-bubble" aria-label={`${tool.instances.length} eksemplarer`}>{tool.instances.length}</span>
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
        <div className="ownership-badges" aria-label={ownedHouses.length ? 'Finnes hos registrerte eiere' : 'Ingen har den'}>
          {ownedHouses.map((house) => <HouseBadge key={house} house={house} size={31} />)}
        </div>
        <div className="tool-card-copy">
          <h3>{tool.name}</h3>
          <p>{tool.type === 'avansert' ? 'Avansert' : 'Grunnleggende'}{tool.instances.length ? ` · ${tool.instances.length} stk` : ''}</p>
          {need > 0 && <strong>Kjøp {need} stk</strong>}
        </div>
      </button>
      {shopping && need > 0 && onPurchased && (
        <button className="purchased-button" onClick={onPurchased}>Kjøpt ✓</button>
      )}
    </article>
  );
}
