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

/** Underfilter for handlelisten: alt, bare kjøp, eller bare flytt. «Kjøp senere» er en egen seksjon, ikke et filter. */
export type ShoppingFilter = 'alle' | 'kjop' | 'flytt';

/** Er kjøp for dette huset markert som «kjøp senere»? */
export function isPostponed(tool: Tool, house: House): boolean {
  return Boolean(tool.postponed?.[house]);
}

/** Antall som må kjøpes (behov utover det som allerede er på vei via flytting). */
export function purchaseNeed(tool: Tool, house: House): number {
  return Math.max(0, effectiveNeed(tool, house) - pendingMoveCount(tool, house));
}

export interface ShoppingSummary {
  moves: { house: House; count: number }[];
  buys: { house: House; count: number }[];
  laters: { house: House; count: number }[];
  moveTotal: number;
  buyTotal: number;
  laterTotal: number;
}

/** Oppsummerer hva som må flyttes, kjøpes eller er utsatt, innenfor valgt hus-omfang. */
export function shoppingSummary(tool: Tool, selectedHouses: House[]): ShoppingSummary {
  const houses = selectedHouses.length ? selectedHouses : HOUSES;
  const moves: { house: House; count: number }[] = [];
  const buys: { house: House; count: number }[] = [];
  const laters: { house: House; count: number }[] = [];
  for (const house of houses) {
    const move = pendingMoveCount(tool, house);
    if (move > 0) moves.push({ house, count: move });
    const buy = purchaseNeed(tool, house);
    if (buy > 0) (isPostponed(tool, house) ? laters : buys).push({ house, count: buy });
  }
  const sum = (rows: { count: number }[]) => rows.reduce((total, row) => total + row.count, 0);
  return { moves, buys, laters, moveTotal: sum(moves), buyTotal: sum(buys), laterTotal: sum(laters) };
}

/** Skal verktøyet vises for det gitte handleliste-underfilteret? */
export function matchesShoppingFilter(summary: ShoppingSummary, filter: ShoppingFilter): boolean {
  switch (filter) {
    case 'kjop':
      return summary.buyTotal > 0;
    case 'flytt':
      return summary.moveTotal > 0;
    default:
      // «Alle» viser aktive gjøremål, men skjuler det som er utsatt til senere.
      return summary.buyTotal > 0 || summary.moveTotal > 0;
  }
}

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
        const buying = isPostponed(tool, house) ? 0 : purchaseNeed(tool, house);
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

/** Best egnede thumbnail: generell bilde, ellers første eksemplar med bilde. */
export function toolThumbnail(tool: Tool): string {
  return tool.image.trim() || tool.instances.find((instance) => instance.image.trim())?.image.trim() || '';
}
