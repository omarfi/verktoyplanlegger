import type { Tool, House } from '../types';
import { HOUSES, countAt, effectiveNeed, houseLabel } from '../logic';
import { HouseBadge } from './HouseBadge';

function HouseStatus({ tool, house }: { tool: Tool; house: House }) {
  const count = countAt(tool, house);
  const need = effectiveNeed(tool, house);
  const overridden = tool.needOverride[house] !== null;

  let chipClass = 'neutral';
  let title = `${houseLabel(house)}: beholdning ${count}`;
  if (count > 0) {
    chipClass = 'have';
  } else if (need > 0) {
    chipClass = 'missing';
    title += ` – trenger ${need}`;
  } else {
    title += ' – ikke behov';
  }
  if (overridden) title += ' (behov overstyrt manuelt)';

  return (
    <span className="house-status" title={title}>
      <HouseBadge house={house} />
      <span className={`count-chip ${chipClass}`}>
        {count > 0 ? count : need > 0 ? <>0<span className="need-affix">→{need}</span></> : '–'}
        {overridden && <span className="override-dot" aria-label="Behov overstyrt" />}
      </span>
    </span>
  );
}

interface ToolCardProps {
  tool: Tool;
  onClick: () => void;
  selectMode?: boolean;
  selected?: boolean;
}

export function ToolCard({ tool, onClick, selectMode = false, selected = false }: ToolCardProps) {
  const withImage = tool.instances.filter((i) => i.image);
  const [primary, ...rest] = withImage;
  const miniThumbs = rest.slice(0, 2);
  const extraCount = rest.length - miniThumbs.length;

  return (
    <div
      className={`tool-card ${selectMode ? 'selectable' : ''} ${selected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <div className="tool-card-image">
        {primary ? (
          <img src={primary.image} alt={tool.name} loading="lazy" referrerPolicy="no-referrer" />
        ) : (
          <div className="tool-card-placeholder" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="36" height="36">
              <path
                d="M14.7 6.3a4 4 0 0 0-5.4 5.4l-6 6L5.6 20l6-6a4 4 0 0 0 5.4-5.4l-2.6 2.6-2-2z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
        {tool.type === 'avansert' && <span className="tool-type-tag">Avansert</span>}
        {selectMode && <span className={`select-check ${selected ? 'on' : ''}`}>{selected ? '✓' : ''}</span>}
        {miniThumbs.length > 0 && (
          <div className="thumb-stack">
            {miniThumbs.map((inst) => (
              <img key={inst.id} src={inst.image} alt="" loading="lazy" referrerPolicy="no-referrer" />
            ))}
            {extraCount > 0 && <span className="thumb-more">+{extraCount}</span>}
          </div>
        )}
      </div>
      <div className="tool-card-info">
        <div className="tool-card-name">{tool.name}</div>
        <div className="tool-card-houses">
          {HOUSES.map((house) => (
            <HouseStatus key={house} tool={tool} house={house} />
          ))}
        </div>
      </div>
    </div>
  );
}
