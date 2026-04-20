import type { Tool, ToolStatus, GapResult } from './types';

export function calculateGaps(tool: Tool): GapResult {
  const atMine = tool.inventory.some((i) => i.location === 'mine');
  const atParents = tool.inventory.some((i) => i.location === 'parents');

  if (tool.type === 'basic') {
    const needsBuy: string[] = [];
    if (!atMine) needsBuy.push('mine');
    if (!atParents) needsBuy.push('parents');
    return {
      mine: atMine,
      parents: atParents,
      needsBuy: tool.chosen !== null ? [] : needsBuy,
      needsMove: null,
    };
  }

  // advanced
  if (atMine) {
    return { mine: true, parents: null, needsBuy: [], needsMove: null };
  }
  if (atParents && !atMine) {
    return { mine: false, parents: true, needsBuy: [], needsMove: 'parents-to-mine' };
  }
  if (tool.inventory.length > 0) {
    return { mine: true, parents: null, needsBuy: [], needsMove: null };
  }
  return {
    mine: false,
    parents: null,
    needsBuy: tool.chosen !== null ? [] : ['mine'],
    needsMove: null,
  };
}

export function getStatus(tool: Tool): ToolStatus {
  if (!tool.inventoryDone) return 'new';

  const gaps = calculateGaps(tool);

  if (tool.type === 'advanced' && gaps.needsMove) {
    if (tool.chosen !== null) return 'done';
    return 'move';
  }

  if (gaps.needsBuy.length === 0) return 'done';
  if (tool.chosen !== null) return 'done';
  if (tool.candidates.length > 0) return 'shopping';
  return 'gap';
}

export function getStatusLabel(status: ToolStatus): string {
  const map: Record<ToolStatus, string> = {
    new: 'Ny',
    gap: 'Mangler',
    shopping: 'Handler',
    done: 'Ferdig',
    move: 'Flyttes',
  };
  return map[status];
}

export function getStatusColor(status: ToolStatus): { bg: string; text: string } {
  const map: Record<ToolStatus, { bg: string; text: string }> = {
    new: { bg: '#e5e7eb', text: '#6b7280' },
    gap: { bg: '#fee2e2', text: '#991b1b' },
    shopping: { bg: '#dbeafe', text: '#1e3a5f' },
    done: { bg: '#d1fae5', text: '#065f46' },
    move: { bg: '#fef3c7', text: '#92400e' },
  };
  return map[status];
}

export function detectShop(url: string): string | null {
  if (!url) return null;
  const lower = url.toLowerCase();
  if (lower.includes('jula.no')) return 'Jula';
  if (lower.includes('biltema.no')) return 'Biltema';
  if (lower.includes('clasohlson.no') || lower.includes('clas-ohlson.no')) return 'Clas Ohlson';
  if (lower.includes('byggmax.no')) return 'Byggmax';
  return null;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
