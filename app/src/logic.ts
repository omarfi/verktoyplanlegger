import type { Tool, House } from './types';

export const HOUSES: House[] = ['osterliveien', 'raschsvei'];

export function houseLabel(house: House): string {
  return house === 'osterliveien' ? 'Østerliveien' : 'Raschs Vei';
}

/** Beholdning: antall eksemplarer plassert i et gitt hus. */
export function countAt(tool: Tool, house: House): number {
  return tool.instances.filter((i) => i.location === house).length;
}

/**
 * Utledet behov: Raschs Vei trenger 1 når beholdningen er 0 (begge typer);
 * Østerliveien trenger 1 kun for basisverktøy (avansert skal bare finnes
 * på Raschs Vei).
 */
export function derivedNeed(tool: Tool, house: House): number {
  if (house === 'osterliveien' && tool.type === 'avansert') return 0;
  return countAt(tool, house) === 0 ? 1 : 0;
}

export function effectiveNeed(tool: Tool, house: House): number {
  return tool.needOverride[house] ?? derivedNeed(tool, house);
}

export type HouseFilter = 'begge' | House;
export type StatusFilter = 'alle' | 'mangler' | 'trenger' | 'har';

export interface Filter {
  house: HouseFilter;
  status: StatusFilter;
}

export function matchesFilter(tool: Tool, filter: Filter): boolean {
  if (filter.status === 'alle') return true;
  const houses = filter.house === 'begge' ? HOUSES : [filter.house];
  switch (filter.status) {
    case 'mangler':
      return houses.every((h) => countAt(tool, h) === 0);
    case 'trenger':
      return houses.every((h) => effectiveNeed(tool, h) > 0);
    case 'har':
      return houses.every((h) => countAt(tool, h) > 0);
    default:
      return true;
  }
}

export function toolMatchesSearch(tool: Tool, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (tool.name.toLowerCase().includes(q)) return true;
  if (tool.category.toLowerCase().includes(q)) return true;
  return tool.instances.some((i) => i.label.toLowerCase().includes(q));
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
