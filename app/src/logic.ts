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
    new: { bg: 'rgb(241,239,232)', text: 'rgb(95,94,90)' },
    gap: { bg: 'rgb(250,236,231)', text: 'rgb(113,43,19)' },
    shopping: { bg: 'rgb(230,241,251)', text: 'rgb(12,68,124)' },
    done: { bg: 'rgb(234,243,222)', text: 'rgb(39,80,10)' },
    move: { bg: 'rgb(250,238,218)', text: 'rgb(99,56,6)' },
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
  if (lower.includes('obsbygg.no') || lower.includes('obs.no')) return 'Obs Bygg';
  return null;
}

export function locationLabel(loc: string): string {
  switch (loc) {
    case 'mine': return 'Raschs Vei';
    case 'parents': return 'Østerliveien';
    default: return 'Ukjent';
  }
}

export function locationClass(loc: string): string {
  switch (loc) {
    case 'mine': return 'location-mine';
    case 'parents': return 'location-parents';
    default: return 'location-unknown';
  }
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
