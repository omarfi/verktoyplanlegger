import { useState } from 'react';
import type { House, PurchaseOption } from '../types';
import { formatNok, houseLabel, housePerson } from '../logic';
import { HouseBadge } from './HouseBadge';
import { ToolImage } from './ToolImage';
import { PurchaseCandidatePanel } from './PurchaseCandidatePanel';

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

const MoveIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

const UndoIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 7 4.5 11.5 9 16" />
    <path d="M4.5 11.5H14a5.5 5.5 0 0 1 0 11h-3" />
  </svg>
);

export interface ShoppingBoardActiveRow {
  state: 'active';
  key: string;
  toolId: string;
  name: string;
  image: string;
  avansert: boolean;
  kind: 'buy' | 'move';
  count: number;
  fromHouseLabel?: string;
  purchaseOptions: PurchaseOption[];
  selectedOptionId: string | null;
  selectedOption: PurchaseOption | null;
  subtotalMinor: number | null;
}

export interface ShoppingBoardDoneRow {
  state: 'done';
  key: string;
  completionId: string;
  toolId: string;
  name: string;
  image: string;
  kind: 'acquired' | 'moved';
}

export type ShoppingBoardRow = ShoppingBoardActiveRow | ShoppingBoardDoneRow;

export interface ShoppingBoardGroup {
  category: string;
  rows: ShoppingBoardRow[];
}

export interface ShoppingBoardLaterRow {
  key: string;
  toolId: string;
  name: string;
  image: string;
  sublabel: string;
}

export interface ShoppingHouseBoardData {
  house: House;
  badgeCount: number;
  groups: ShoppingBoardGroup[];
  later: ShoppingBoardLaterRow[];
  totalMinor: number;
  missingPriceCount: number;
}

interface ShoppingBoardProps {
  boards: ShoppingHouseBoardData[];
  onOpenTool: (toolId: string) => void;
  onCheckOffActive: (row: ShoppingBoardActiveRow, house: House) => void;
  onPostpone: (row: ShoppingBoardActiveRow, house: House) => void;
  onCheckOffLater: (row: ShoppingBoardLaterRow, house: House) => void;
  onResumeLater: (row: ShoppingBoardLaterRow, house: House) => void;
  onUndo: (row: ShoppingBoardDoneRow, house: House) => void;
  onSavePurchaseOption: (row: ShoppingBoardActiveRow, house: House, option: PurchaseOption) => void;
  onSelectPurchaseOption: (row: ShoppingBoardActiveRow, house: House, optionId: string) => void;
  onRemovePurchaseOption: (row: ShoppingBoardActiveRow, house: House, optionId: string) => void;
}

function ActiveRow({ row, house, onOpenTool, onCheckOffActive, onPostpone, onSavePurchaseOption, onSelectPurchaseOption, onRemovePurchaseOption }: {
  row: ShoppingBoardActiveRow;
  house: House;
  onOpenTool: (toolId: string) => void;
  onCheckOffActive: (row: ShoppingBoardActiveRow, house: House) => void;
  onPostpone: (row: ShoppingBoardActiveRow, house: House) => void;
  onSavePurchaseOption: ShoppingBoardProps['onSavePurchaseOption'];
  onSelectPurchaseOption: ShoppingBoardProps['onSelectPurchaseOption'];
  onRemovePurchaseOption: ShoppingBoardProps['onRemovePurchaseOption'];
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`board-row-wrap${expanded ? ' is-expanded' : ''}`}>
      <div className="board-row">
        <button className="board-check" aria-label="Kvitter ut" onClick={() => onCheckOffActive(row, house)} />
        <span className="board-thumb"><ToolImage src={row.image} alt="" /></span>
        <button
          className="board-row-body"
          aria-expanded={row.kind === 'buy' ? expanded : undefined}
          onClick={() => row.kind === 'buy' ? setExpanded((value) => !value) : onOpenTool(row.toolId)}
        >
          <span className="board-row-name-line">
            <span className="board-row-name">{row.name}</span>
            {row.avansert && <span className="board-row-tag is-advanced">Avansert</span>}
          </span>
          {row.kind === 'move' && <span className="board-row-tag is-move"><MoveIcon />Flytt fra {row.fromHouseLabel}</span>}
          {row.kind === 'buy' && row.selectedOption && (
            <span className="board-row-sub">{row.selectedOption.retailer} · {row.selectedOption.priceMinor === null ? 'pris mangler' : `${formatNok(row.selectedOption.priceMinor)}/stk`}</span>
          )}
          {row.kind === 'buy' && !row.selectedOption && <span className="board-row-sub">Velg innkjøpskandidat</span>}
        </button>
        {row.count > 1 && <span className="board-qty">×{row.count}</span>}
        {row.subtotalMinor !== null && <span className="board-row-price">{formatNok(row.subtotalMinor)}</span>}
        {row.kind === 'buy' && <button className="board-details" title="Åpne verktøydetaljer" aria-label={`Åpne detaljer for ${row.name}`} onClick={() => onOpenTool(row.toolId)}>•••</button>}
        {row.kind === 'buy' && <button className="board-postpone" title="Kjøp senere" onClick={() => onPostpone(row, house)}><ClockIcon /></button>}
      </div>
      {row.kind === 'buy' && expanded && (
        <PurchaseCandidatePanel
          options={row.purchaseOptions}
          selectedId={row.selectedOptionId}
          onSave={(option) => onSavePurchaseOption(row, house, option)}
          onSelect={(optionId) => onSelectPurchaseOption(row, house, optionId)}
          onRemove={(optionId) => onRemovePurchaseOption(row, house, optionId)}
        />
      )}
    </div>
  );
}

function DoneRow({ row, house, onOpenTool, onUndo }: {
  row: ShoppingBoardDoneRow;
  house: House;
  onOpenTool: (toolId: string) => void;
  onUndo: (row: ShoppingBoardDoneRow, house: House) => void;
}) {
  return (
    <div className="board-row is-done">
      <span className="board-check-done" aria-hidden="true"><CheckIcon /></span>
      <span className="board-thumb is-faded"><ToolImage src={row.image} alt="" /></span>
      <button className="board-row-body" onClick={() => onOpenTool(row.toolId)}>
        <span className="board-row-name is-done-name">{row.name}</span>
        <span className="board-row-sub">{row.kind === 'acquired' ? 'Anskaffet' : 'Flyttet'}</span>
      </button>
      <button className="board-undo" onClick={() => onUndo(row, house)}>Angre</button>
    </div>
  );
}

function LaterRow({ row, house, onOpenTool, onCheckOffLater, onResumeLater }: {
  row: ShoppingBoardLaterRow;
  house: House;
  onOpenTool: (toolId: string) => void;
  onCheckOffLater: (row: ShoppingBoardLaterRow, house: House) => void;
  onResumeLater: (row: ShoppingBoardLaterRow, house: House) => void;
}) {
  return (
    <div className="board-row is-later">
      <button className="board-check" aria-label="Kvitter ut" onClick={() => onCheckOffLater(row, house)} />
      <span className="board-thumb is-dim"><ToolImage src={row.image} alt="" /></span>
      <button className="board-row-body" onClick={() => onOpenTool(row.toolId)}>
        <span className="board-row-name">{row.name}</span>
        <span className="board-row-sub">{row.sublabel}</span>
      </button>
      <button className="board-resume" onClick={() => onResumeLater(row, house)}><UndoIcon />Til listen</button>
    </div>
  );
}

function HouseCard({ board, onOpenTool, onCheckOffActive, onPostpone, onCheckOffLater, onResumeLater, onUndo, onSavePurchaseOption, onSelectPurchaseOption, onRemovePurchaseOption }: { board: ShoppingHouseBoardData } & Omit<ShoppingBoardProps, 'boards'>) {
  const [laterOpen, setLaterOpen] = useState(false);

  return (
    <section className="board-card">
      <div className="board-card-header">
        <HouseBadge house={board.house} size={28} />
        <div className="board-card-heading">
          <div className="board-card-title">{houseLabel(board.house)}</div>
          <div className="board-card-person">{housePerson(board.house)}</div>
        </div>
        <span className="board-card-count">{board.badgeCount} igjen</span>
      </div>

      {board.groups.map((group) => (
        <div key={group.category}>
          <div className="board-category-label">{group.category}</div>
          {group.rows.map((row) => row.state === 'active'
            ? <ActiveRow row={row} house={board.house} onOpenTool={onOpenTool} onCheckOffActive={onCheckOffActive} onPostpone={onPostpone} onSavePurchaseOption={onSavePurchaseOption} onSelectPurchaseOption={onSelectPurchaseOption} onRemovePurchaseOption={onRemovePurchaseOption} key={row.key} />
            : <DoneRow row={row} house={board.house} onOpenTool={onOpenTool} onUndo={onUndo} key={row.key} />)}
        </div>
      ))}

      {board.later.length > 0 && (
        <div className="board-later">
          <button className="board-later-toggle" aria-expanded={laterOpen} onClick={() => setLaterOpen((value) => !value)}>
            <ClockIcon />
            Kjøp senere
            <span className="board-later-count">{board.later.length}</span>
            <span className="board-later-chevron" aria-hidden="true">⌄</span>
          </button>
          {laterOpen && board.later.map((row) => (
            <LaterRow row={row} house={board.house} onOpenTool={onOpenTool} onCheckOffLater={onCheckOffLater} onResumeLater={onResumeLater} key={row.key} />
          ))}
        </div>
      )}
      {(board.totalMinor > 0 || board.missingPriceCount > 0) && (
        <footer className="board-total">
          <span><strong>Sum valgte varer</strong>{board.missingPriceCount > 0 && <small>{board.missingPriceCount} {board.missingPriceCount === 1 ? 'vare mangler' : 'varer mangler'} valgt pris</small>}</span>
          <b>{formatNok(board.totalMinor)}</b>
        </footer>
      )}
    </section>
  );
}

export function ShoppingBoard({ boards, onOpenTool, onCheckOffActive, onPostpone, onCheckOffLater, onResumeLater, onUndo, onSavePurchaseOption, onSelectPurchaseOption, onRemovePurchaseOption }: ShoppingBoardProps) {
  return (
    <div className="shopping-board">
      {boards.map((board) => (
        <HouseCard
          board={board}
          onOpenTool={onOpenTool}
          onCheckOffActive={onCheckOffActive}
          onPostpone={onPostpone}
          onCheckOffLater={onCheckOffLater}
          onResumeLater={onResumeLater}
          onUndo={onUndo}
          onSavePurchaseOption={onSavePurchaseOption}
          onSelectPurchaseOption={onSelectPurchaseOption}
          onRemovePurchaseOption={onRemovePurchaseOption}
          key={board.house}
        />
      ))}
    </div>
  );
}
