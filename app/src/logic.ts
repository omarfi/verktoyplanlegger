import type { Tool, House } from './types';

export const HOUSES: House[] = ['osterliveien', 'raschsvei'];

export function houseLabel(house: House): string {
  return house === 'osterliveien' ? 'Østerliveien' : 'Raschs Vei';
}

export function housePerson(house: House): string {
  return house === 'osterliveien' ? 'Ilyas' : 'Omar';
}

export function houseInitials(house: House): string {
  return house === 'osterliveien' ? 'IL' : 'OM';
}

export function otherHouse(house: House): House {
  return house === 'osterliveien' ? 'raschsvei' : 'osterliveien';
}

/** Beholdning: antall eksemplarer plassert i et gitt hus. */
export function countAt(tool: Tool, house: House): number {
  return tool.instances.filter((i) => i.location === house).length;
}

/** Eksemplarer som er markert for, men ikke bekreftet flyttet til huset. */
export function pendingMoveCount(tool: Tool, house: House): number {
  return tool.instances.filter((instance) => instance.moveTo === house).length;
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
export type ViewIntent = 'alle' | 'handleliste' | 'har';

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
  const q = normalize(query);
  if (!q) return true;
  if (normalize(tool.name).includes(q)) return true;
  if (normalize(tool.category).includes(q)) return true;
  if (normalize(tool.notes).includes(q)) return true;
  return tool.instances.some((i) => normalize(i.label).includes(q));
}

export function normalize(value = ''): string {
  return value
    .toLocaleLowerCase('nb')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ø/g, 'o')
    .replace(/æ/g, 'ae')
    .trim();
}

export function matchesIntent(tool: Tool, intent: ViewIntent, selectedHouses: House[]): boolean {
  const houses = selectedHouses.length ? selectedHouses : HOUSES;
  if (intent === 'handleliste') return houses.some((house) => effectiveNeed(tool, house) > 0 || pendingMoveCount(tool, house) > 0);
  if (intent === 'har') return houses.some((house) => countAt(tool, house) > 0);
  return true;
}

export interface DuplicateMatch {
  tool: Tool;
  score: number;
}

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) {
    return Math.min(a.length, b.length) / Math.max(a.length, b.length) + 0.2;
  }
  const aa = new Set(a.split(/\s+/));
  const bb = new Set(b.split(/\s+/));
  const overlap = [...aa].filter((word) => bb.has(word)).length;
  return overlap / Math.max(aa.size, bb.size);
}

export function findDuplicates(name: string, tools: Tool[], exceptId = ''): DuplicateMatch[] {
  const wanted = normalize(name);
  if (!wanted) return [];
  return tools
    .filter((tool) => tool.id !== exceptId)
    .map((tool) => ({ tool, score: similarity(wanted, normalize(tool.name)) }))
    .filter(({ score }) => score >= 0.55)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

const CATEGORY_HINTS: [string, RegExp][] = [
  ['Måleverktøy', /mål|vater|linjal|vinkel|skyve/],
  ['Skrutrekkere og bits', /skru|bits|torx/],
  ['Nøkler', /nøkkel/],
  ['Tenger', /tang/],
  ['Klemmer og tvinger', /klem|tving/],
  ['Skjæreverktøy', /sag|kniv|saks|meisel|fil/],
  ['Slagverktøy', /hammer|klubbe/],
  ['Arbeidslys', /lys|lykt/],
  ['Oppbevaring', /kasse|boks|skuff|oppbevar/],
];

export function suggestCategory(name: string): string {
  const value = normalize(name);
  return CATEGORY_HINTS.find(([, pattern]) => pattern.test(value))?.[0] ?? 'Annet';
}

export function shoppingListText(tools: Tool[], selectedHouses: House[]): string {
  const houses = selectedHouses.length ? selectedHouses : HOUSES;
  const sections = houses
    .map((house) => {
      const rows = tools.flatMap((tool) => {
        const moving = pendingMoveCount(tool, house);
        const buying = Math.max(0, effectiveNeed(tool, house) - moving);
        return [
          ...(moving ? [`• Flytt ${tool.name}${moving > 1 ? ` ×${moving}` : ''}`] : []),
          ...(buying ? [`• Kjøp ${tool.name}${buying > 1 ? ` ×${buying}` : ''}`] : []),
        ];
      });
      return rows.length ? `${houseLabel(house)}:\n${rows.join('\n')}` : '';
    })
    .filter(Boolean);
  return `Handleliste – Verktøyplanlegger\n\n${sections.join('\n\n')}`;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
