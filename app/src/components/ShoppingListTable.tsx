import type { Tool } from '../types';
import type { ShoppingSummary } from '../logic';
import { houseLabel } from '../logic';
import { HouseBadge } from './HouseBadge';
import { ToolImage } from './ToolImage';

const CheckIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.5 10 17.5 19 6.5" />
  </svg>
);

const ClockIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);

const UndoIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 7 4.5 11.5 9 16" />
    <path d="M4.5 11.5H14a5.5 5.5 0 0 1 0 11h-3" />
  </svg>
);

/** Best egnede thumbnail: generell bilde, ellers første eksemplar med bilde. */
function thumbnailSrc(tool: Tool): string {
  return tool.image.trim() || tool.instances.find((instance) => instance.image.trim())?.image.trim() || '';
}

export interface ShoppingRow {
  tool: Tool;
  summary: ShoppingSummary;
}

export interface ShoppingGroup {
  category: string;
  rows: ShoppingRow[];
}

interface ShoppingListTableProps {
  groups: ShoppingGroup[];
  onOpen: (tool: Tool) => void;
  onAcquired: (tool: Tool) => void;
  onMoved: (tool: Tool) => void;
  onPostpone: (tool: Tool) => void;
  onResume: (tool: Tool) => void;
}

export function ShoppingListTable({ groups, onOpen, onAcquired, onMoved, onPostpone, onResume }: ShoppingListTableProps) {
  return (
    <div className="shopping-table-wrap">
      <table className="shopping-table">
        <thead>
          <tr>
            <th scope="col" className="col-thumb"><span className="sr-only">Bilde</span></th>
            <th scope="col">Verktøy</th>
            <th scope="col">Handling</th>
            <th scope="col" className="col-actions"><span className="sr-only">Handlinger</span></th>
          </tr>
        </thead>
        {groups.map(({ category, rows }) => (
          <tbody key={category}>
            <tr className="shopping-group-row">
              <th scope="colgroup" colSpan={4}>{category}</th>
            </tr>
            {rows.map(({ tool, summary }) => {
              const stop = (event: React.MouseEvent) => event.stopPropagation();
              return (
                <tr key={tool.id} className="shopping-row" onClick={() => onOpen(tool)}>
                  <td className="col-thumb">
                    <span className="shopping-thumb"><ToolImage src={thumbnailSrc(tool)} alt="" /></span>
                  </td>
                  <td className="shopping-name">
                    <button className="shopping-name-button" onClick={(event) => { stop(event); onOpen(tool); }}>
                      <strong>{tool.name}</strong>
                      <span className="shopping-meta">
                        {tool.category}
                        {tool.type === 'avansert' && <span className="tool-type-tag">Avansert</span>}
                      </span>
                    </button>
                  </td>
                  <td className="shopping-action">
                    {summary.moves.map(({ house, count }) => (
                      <span className="shopping-tag is-move" key={`move-${house}`}>
                        <HouseBadge house={house} size={18} />
                        Flytt{count > 1 ? ` ${count} stk` : ''} til {houseLabel(house)}
                      </span>
                    ))}
                    {summary.buys.map(({ house, count }) => (
                      <span className="shopping-tag is-buy" key={`buy-${house}`}>
                        <HouseBadge house={house} size={18} />
                        Kjøp {count} stk til {houseLabel(house)}
                      </span>
                    ))}
                    {summary.laters.map(({ house, count }) => (
                      <span className="shopping-tag is-later" key={`later-${house}`}>
                        <HouseBadge house={house} size={18} />
                        Senere · {count} stk til {houseLabel(house)}
                      </span>
                    ))}
                  </td>
                  <td className="col-actions">
                    <div className="shopping-buttons">
                      {summary.moveTotal > 0 && (
                        <button className="checkoff-button is-compact" onClick={(event) => { stop(event); onMoved(tool); }}>
                          <CheckIcon /> Flyttet
                        </button>
                      )}
                      {(summary.buyTotal > 0 || summary.laterTotal > 0) && (
                        <button className="checkoff-button is-compact" onClick={(event) => { stop(event); onAcquired(tool); }}>
                          <CheckIcon /> Anskaffet
                        </button>
                      )}
                      {summary.buyTotal > 0 && (
                        <button className="postpone-button" onClick={(event) => { stop(event); onPostpone(tool); }}>
                          <ClockIcon /> Kjøp senere
                        </button>
                      )}
                      {summary.laterTotal > 0 && (
                        <button className="postpone-button is-resume" onClick={(event) => { stop(event); onResume(tool); }}>
                          <UndoIcon /> Til handlelisten
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </div>
  );
}
