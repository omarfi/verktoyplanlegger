import type { Tool, ToolInstance, ToolType, House } from './types';
import { countAt, generateId, normalize } from './logic';

/**
 * Engangsimport av Omars beholdning på Raschs Vei.
 *
 * Kjøres fra profilmenyen mens Omar er innlogget, så den gjenbruker appens
 * egen auth og Firestore-skriving (`putTool`) – ingen konsoll eller re-innlogging.
 *
 * IDEMPOTENT: hvert verktøy «toppes opp» til måltallet på Raschs Vei i stedet
 * for å legge til blindt, så knappen er trygg å trykke på flere ganger.
 *
 * Den menneskelesbare planen ligger i `scripts/raschsvei-inventory.json`.
 */

const LOCATION: House = 'raschsvei';

interface MatchItem {
  id: string;
  name: string;
  target: number;
  label?: string;
  labels?: string[];
  note?: string;
}

interface NewItem {
  name: string;
  category: string;
  type: ToolType;
  count: number;
  label?: string;
  note?: string;
}

const MATCHES: MatchItem[] = [
  { id: 'sheet-tommestokk-1m', name: 'Tommestokk', target: 1 },
  { id: 'tool-3', name: 'Vater (kort)', target: 1, label: 'Gult' },
  { id: 'sheet-vater-600mm', name: 'Vater lang', target: 1, label: 'Blått' },
  { id: 'tool-6', name: 'Skyvelære', target: 1 },
  { id: 'tool-12', name: 'Snekkerblyant', target: 4, note: 'Ca. 4 blyanter (estimert)' },
  { id: 'tool-21', name: 'Bitsholder med bitsett', target: 1, label: 'Kort skrutrekker / bitsholder' },
  { id: 'tool-22', name: 'Skiftenøkkel', target: 1 },
  { id: 'tool-24', name: 'Kombinasjonsnøkler', target: 10, note: 'Ca. 10 i ulike størrelser (estimert)' },
  { id: 'tool-26', name: 'Unbrakonøkkel', target: 1, label: 'Sammenleggbart sett' },
  { id: 'sheet-pipenoekkelsett', name: 'Pipenøkkelsett', target: 1, note: 'Sett med ca. 13–15 piper' },
  {
    id: 'sheet-bits-og-borsett',
    name: 'Bits og borsett',
    target: 2,
    labels: ['Løse bor, assortert (tre/metall/mur)', 'Metabo borsett (koffert)'],
  },
  { id: 'tool-49', name: 'Saks', target: 1 },
  { id: 'tool-42', name: 'Håndsag', target: 1, label: 'Kort / beskjæringssag' },
  { id: 'tool-43', name: 'Baufil', target: 1 },
  { id: 'tool-48', name: 'Platesaks', target: 1, label: 'Blikksaks, grønt håndtak' },
  {
    id: 'tool-50',
    name: 'Hullsag',
    target: 2,
    labels: ['Hullsagsett (flere størrelser)', 'Stor hullsag (kan tilhøre settet)'],
  },
  { id: 'tool-52', name: 'Hammer', target: 1, label: 'Snekkerhammer' },
  { id: 'tool-58', name: 'Brekkjern', target: 1 },
  { id: 'tool-51', name: 'Meisel', target: 1, label: 'Flatmeisel / brytejern' },
  { id: 'tool-36', name: 'Hurtigtvinge', target: 4, note: 'Ca. 4 (estimert)' },
  { id: 'tool-69', name: 'Avisoleringstang', target: 1, label: 'Oransje/svart, med krympefunksjon' },
];

const NEWS: NewItem[] = [
  { name: 'Målebånd 50 m (glassfiber)', category: 'Måleverktøy', type: 'avansert', count: 1, note: 'Glassfibermålebånd på snelle' },
  { name: 'Mini-libelle', category: 'Måleverktøy', type: 'avansert', count: 1, note: 'Liten løs vaterlibelle' },
  { name: 'Skrutrekkere (assortert)', category: 'Skrutrekkere og bits', type: 'avansert', count: 3, note: 'Ulike størrelser' },
  { name: 'Vinkeladapter (90°) for bits/drill', category: 'Skrutrekkere og bits', type: 'avansert', count: 1, note: '90-graders adapter' },
  { name: 'Spesialnøkler (små)', category: 'Nøkler', type: 'avansert', count: 3, note: 'Ulike typer' },
  { name: 'Skrallenøkkel', category: 'Nøkler', type: 'avansert', count: 1 },
  { name: 'Pipehåndtak langt / brytejern', category: 'Nøkler', type: 'avansert', count: 1 },
  { name: 'Pipeforlengere', category: 'Nøkler', type: 'avansert', count: 3, note: 'Ca. 3 (estimert)' },
  { name: 'Flatbor (tre)', category: 'Skrutrekkere og bits', type: 'avansert', count: 2 },
  { name: 'Rasp-/fresebits (roterende)', category: 'Skrutrekkere og bits', type: 'avansert', count: 7, note: 'Ca. 7 (estimert)' },
  { name: 'Fliseborsett (glass/flis)', category: 'Skrutrekkere og bits', type: 'avansert', count: 1, note: '4 bor i rød eske' },
  { name: 'Langt spesialbor', category: 'Skrutrekkere og bits', type: 'avansert', count: 1, note: 'Ligger i verktøykassen' },
  { name: 'Batteridrill / skrutrekker', category: 'Elektroverktøy', type: 'avansert', count: 1, label: 'DeWalt' },
  { name: 'Stikksag', category: 'Elektroverktøy', type: 'avansert', count: 1, label: 'DeWalt' },
  { name: 'Eksentersliper', category: 'Elektroverktøy', type: 'avansert', count: 1, label: 'DeWalt' },
  { name: 'Kabel-/platesaks', category: 'Skjæreverktøy', type: 'avansert', count: 1, note: 'Rødt/svart håndtak; nøyaktig type usikker' },
  { name: 'Plastrørkutter', category: 'Skjæreverktøy', type: 'avansert', count: 1, label: 'Oransje' },
  { name: 'Stiftepistol', category: 'Slagverktøy', type: 'avansert', count: 1, note: 'Manuell' },
  { name: 'Fjærklemme', category: 'Klemmer og tvinger', type: 'avansert', count: 4, note: 'Ca. 4 (estimert)' },
  { name: 'Nettverkstester', category: 'Elektrisk håndverktøy', type: 'avansert', count: 1 },
  { name: 'RJ45-krympetang', category: 'Elektrisk håndverktøy', type: 'avansert', count: 1, label: 'Blått/svart håndtak' },
  { name: 'Uidentifisert blått spesialverktøy', category: 'Annet', type: 'avansert', count: 1, note: 'Langt blått håndverktøy med flere metallruller; funksjon ikke bekreftet' },
];

export interface ImportResult {
  writes: number;
  unchanged: number;
  created: number;
  report: string[];
}

function makeInstance(label = ''): ToolInstance {
  return { id: generateId(), location: LOCATION, image: '', label, moveTo: null };
}

function appendNote(existing: string, note?: string): string {
  if (!note) return existing;
  const current = existing.trim();
  if (!current) return note;
  if (normalize(current).includes(normalize(note))) return current;
  return `${current}\n${note}`;
}

/** Legger eksemplarer på et eksisterende verktøy opp til `target`. */
function topUp(
  tool: Tool,
  target: number,
  extra: { label?: string; labels?: string[]; note?: string }
): { updated: Tool | null; line: string } {
  const have = countAt(tool, LOCATION);
  const toAdd = Math.max(0, target - have);
  const nextNotes = appendNote(tool.notes, extra.note);
  if (toAdd === 0 && nextNotes === tool.notes) {
    return { updated: null, line: `= ${tool.name}: allerede ${have} på Raschs Vei (mål ${target}) – uendret` };
  }
  const instances = [...tool.instances];
  for (let k = 0; k < toAdd; k++) {
    const label = extra.labels ? extra.labels[have + k] ?? extra.labels.at(-1) ?? '' : extra.label ?? '';
    instances.push(makeInstance(label));
  }
  const updated: Tool = { ...tool, instances, notes: nextNotes };
  const line = toAdd > 0 ? `+ ${tool.name}: ${have} → ${have + toAdd} på Raschs Vei` : `~ ${tool.name}: notat oppdatert`;
  return { updated, line };
}

/**
 * Bruker planen på gjeldende verktøyliste og skriver endringene via `putTool`.
 * Rekkefølgen holder en lokal arbeidskopi så flere planlinjer mot samme navn
 * ikke lager duplikater i én kjøring.
 */
export function runRaschsveiImport(tools: Tool[], putTool: (tool: Tool) => void): ImportResult {
  const byId = new Map(tools.map((tool) => [tool.id, tool]));
  const byName = new Map(tools.map((tool) => [normalize(tool.name), tool]));
  const report: string[] = [];
  let writes = 0;
  let unchanged = 0;
  let created = 0;

  const commit = (tool: Tool) => {
    putTool(tool);
    byId.set(tool.id, tool);
    byName.set(normalize(tool.name), tool);
    writes += 1;
  };

  for (const match of MATCHES) {
    const tool = byId.get(match.id) ?? byName.get(normalize(match.name));
    if (!tool) {
      report.push(`! Fant ikke «${match.name}» (${match.id}) – hoppet over`);
      continue;
    }
    const { updated, line } = topUp(tool, match.target, match);
    report.push(line);
    if (updated) commit(updated);
    else unchanged += 1;
  }

  for (const item of NEWS) {
    const existing = byName.get(normalize(item.name));
    if (existing) {
      const { updated, line } = topUp(existing, item.count, { label: item.label, note: item.note });
      report.push(line);
      if (updated) commit(updated);
      else unchanged += 1;
      continue;
    }
    const instances: ToolInstance[] = [];
    for (let k = 0; k < item.count; k++) instances.push(makeInstance(item.label ?? ''));
    const tool: Tool = {
      id: generateId(),
      name: item.name,
      category: item.category,
      type: item.type,
      image: '',
      instances,
      needOverride: { osterliveien: null, raschsvei: null },
      notes: item.note ?? '',
      v: 4,
    };
    commit(tool);
    created += 1;
    report.push(`★ NY ${item.name} (${item.category}): ${item.count} på Raschs Vei`);
  }

  return { writes, unchanged, created, report };
}
