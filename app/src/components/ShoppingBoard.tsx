import { useState } from 'react';
import type { House } from '../types';
import { houseLabel, housePerson } from '../logic';
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
}

interface ShoppingBoardProps {
  boards: ShoppingHouseBoardData[];
  onOpenTool: (toolId: string) => void;
  onCheckOffActive: (row: ShoppingBoardActiveRow, house: House) => void;
  onPostpone: (row: ShoppingBoardActiveRow, house: House) => void;
  onCheckOffLater: (row: ShoppingBoardLaterRow, house: House) => void;
  onResumeLater: (row: ShoppingBoardLaterRow, house: House) => void;
  onUndo: (row: ShoppingBoardDoneRow, house: House) => void;
}

function ActiveRow({ row, house, onOpenTool, onCheckOffActive, onPostpone }: {
  row: ShoppingBoardActiveRow;
  house: House;
  onOpenTool: (toolId: string) => void;
  onCheckOffActive: (row: ShoppingBoardActiveRow, house: House) => void;
  onPostpone: (row: ShoppingBoardActiveRow, house: House) => void;
}) {
  return (
    <div className="board-row">
      <button className="board-check" aria-label="Kvitter ut" onClick={() => onCheckOffActive(row, house)} />
      <span className="board-thumb"><ToolImage src={row.image} alt="" /></span>
      <button className="board-row-body" onClick={() => onOpenTool(row.toolId)}>
        <span className="board-row-name-line">
          <span className="board-row-name">{row.name}</span>
          {row.avansert && <span className="board-row-tag is-advanced">Avansert</span>}
        </span>
        {row.kind === 'move' && (
          <span className="board-row-tag is-move"><MoveIcon />Flytt fra {row.fromHouseLabel}</span>
        )}
      </button>
      {row.count > 1 && <span className="board-qty">×{row.count}</span>}
      {row.kind === 'buy' && (
        <button className="board-postpone" title="Kjøp senere" onClick={() => onPostpone(row, house)}><ClockIcon /></button>
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

function HouseCard({ board, onOpenTool, onCheckOffActive, onPostpone, onCheckOffLater, onResumeLater, onUndo }: { board: ShoppingHouseBoardData } & Omit<ShoppingBoardProps, 'boards'>) {
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
            ? <ActiveRow row={row} house={board.house} onOpenTool={onOpenTool} onCheckOffActive={onCheckOffActive} onPostpone={onPostpone} key={row.key} />
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
    </section>
  );
}

export function ShoppingBoard({ boards, onOpenTool, onCheckOffActive, onPostpone, onCheckOffLater, onResumeLater, onUndo }: ShoppingBoardProps) {
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
          key={board.house}
        />
      ))}
    </div>
  );
}
