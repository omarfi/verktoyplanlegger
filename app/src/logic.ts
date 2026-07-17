import type { Tool, House } from './types';

export const HOUSES: House[] = ['osterliveien', 'raschsvei'];

export function houseLabel(house: House): string {
  return house === 'osterliveien' ? 'Østerliveien' : 'Raschs Vei';
}

/**
 * Utledet behov: Raschs Vei trenger 1 når beholdningen er 0 (begge typer);
 * Østerliveien trenger 1 kun for basisverktøy (avansert skal bare finnes
 * på Raschs Vei).
 */
export function derivedNeed(tool: Tool, house: House): number {
  if (house === 'osterliveien' && tool.type === 'avansert') return 0;
  return tool.counts[house] === 0 ? 1 : 0;
}

export function effectiveNeed(tool: Tool, house: House): number {
  return tool.needOverride[house] ?? derivedNeed(tool, house);
}

export type HouseFilter = 'begge' | House;
export type StatusFilter = 'alle' | 'mangler' | 'har';

export interface Filter {
  house: HouseFilter;
  status: StatusFilter;
}

export function matchesFilter(tool: Tool, filter: Filter): boolean {
  if (filter.status === 'alle') return true;
  const houses = filter.house === 'begge' ? HOUSES : [filter.house];
  return filter.status === 'mangler'
    ? houses.every((h) => tool.counts[h] === 0)
    : houses.every((h) => tool.counts[h] > 0);
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
