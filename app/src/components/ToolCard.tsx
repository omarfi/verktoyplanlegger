import { useRef } from 'react';
import type { Tool, House } from '../types';
import { HOUSES, countAt, effectiveNeed, houseLabel, pendingMoveCount } from '../logic';
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
  onAcquired?: () => void;
  onMoved?: () => void;
}

function cardImages(tool: Tool): string[] {
  const unique = (images: string[]) => {
    const seen = new Set<string>();
    const result = images
      .map((image) => image.trim())
      .filter((image) => {
        if (!image || seen.has(image)) return false;
        seen.add(image);
        return true;
      });
    return result.length ? result : [''];
  };

  const generalImage = tool.image.trim();
  if (tool.instances.length === 0) return unique([generalImage]);

  if (tool.instances.length === 1) {
    const instanceImage = tool.instances[0].image.trim();
    return unique([generalImage, instanceImage]);
  }

  return unique(tool.instances.slice(0, 2).map((instance) => instance.image.trim() || generalImage));
}

export function ToolCard({
  tool,
  onClick,
  onLongPress,
  selectMode = false,
  selected = false,
  selectedHouses,
  shopping = false,
  onAcquired,
  onMoved,
}: ToolCardProps) {
  const timer = useRef<number | null>(null);
  const longPressed = useRef(false);
  const ownedHouses = HOUSES
    .map((house) => ({ house, count: countAt(tool, house) }))
    .filter(({ count }) => count > 0);
  const scope = selectedHouses.length ? selectedHouses : HOUSES;
  const moves = scope
    .map((house) => ({ house, count: pendingMoveCount(tool, house) }))
    .filter(({ count }) => count > 0);
  const needs = scope
    .map((house) => ({ house, count: Math.max(0, effectiveNeed(tool, house) - pendingMoveCount(tool, house)) }))
    .filter(({ count }) => count > 0);
  const need = needs.reduce((sum, item) => sum + item.count, 0);
  const images = cardImages(tool);
  const pendingInstance = tool.instances.find((instance) => instance.moveTo && scope.includes(instance.moveTo));

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
        <div className={`tool-card-image ${images.length > 1 ? 'is-split' : ''}`}>
          {images.map((image, index) => (
            <span className="tool-card-image-pane" key={`${image}-${index}`}>
              <ToolImage src={image} alt="" />
            </span>
          ))}
        </div>
        <div className="ownership-badges" aria-label={ownedHouses.length ? 'Beholdning hos registrerte eiere' : 'Ingen har den'}>
          {ownedHouses.map(({ house, count }) => (
            <span className="ownership-badge" key={house} aria-label={`${count} stk hos ${houseLabel(house)}`}>
              <HouseBadge house={house} size={44} />
              {count > 1 && <span className="ownership-count" aria-hidden="true">{count}</span>}
            </span>
          ))}
        </div>
        <div className="tool-card-copy">
          <h3>{tool.name}</h3>
          {tool.type === 'avansert' && <span className="tool-type-tag">Avansert</span>}
          {moves.length > 0 && (
            <div className="tool-move-list">
              {moves.map(({ house, count }) => <strong key={house}>Flytt{count > 1 ? ` ${count} stk` : ''} til {houseLabel(house)}</strong>)}
            </div>
          )}
          {needs.length > 0 && (
            <div className="tool-need-list">
              {needs.map(({ house, count }) => <strong key={house}>Kjøp {count} stk til {houseLabel(house)}</strong>)}
            </div>
          )}
        </div>
      </button>
      {shopping && (pendingInstance || need > 0) && (
        <div className="tool-card-actions">
          {pendingInstance && onMoved && <button className="moved-button" onClick={onMoved}><span aria-hidden="true">✓</span> Flyttet</button>}
          {need > 0 && onAcquired && <button className="acquired-button" onClick={onAcquired}><span aria-hidden="true">✓</span> Anskaffet</button>}
        </div>
      )}
    </article>
  );
}
