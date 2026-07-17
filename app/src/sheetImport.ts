import { doc, getDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { SHEET_ROWS, type SheetRow } from './sheetData';
import type { Tool, InventoryItem } from './types';

export const SHEET_IMPORT_VERSION = 1;

const importMetaDoc = doc(db, 'meta', 'sheetImport');

// Regneark-navn → navn brukt i den eksisterende verktøylisten, slik at
// importen oppdaterer riktig dokument i stedet for å lage en dublett.
const NAME_ALIASES: Record<string, string> = {
  'tapetkniv': 'tapetkniv / hobbykniv',
  'stållinjal': 'linjal / stållinjal',
  'vinkelhake': 'vinkelhake / tømrer-vinkel',
  'spenningsstester': 'spenningssøker (manuell)',
  'platesaks': 'blikksaks',
  'rissepenn': 'rissenål',
  'merketusj': 'merkepenn',
  'hullsag': 'hullemaker / hullsag',
  'kapp og gjæringssag': 'gjæringssag',
  'skrutvinge medium': 'skrutvinge',
  'arbeidslampe': 'bærbart arbeidslys',
  'tommestokk 2m': 'tommestokk',
  'målebånd ikea': 'målebånd',
  'vater 1200mm': 'vater (lang)',
};

function normalize(name: string): string {
  return name.trim().toLowerCase();
}

function slugify(name: string): string {
  return normalize(name)
    .replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface MergedRow {
  category: string;
  name: string;
  level: SheetRow['level'];
  pappa: number | null;
  meg: number | null;
  kommentar: string;
  images: string[];
}

// Regnearket kan ha flere rader for samme verktøy (f.eks. to skiftenøkler
// med hvert sitt bilde) — slå dem sammen til ett verktøy med summerte antall.
function mergeRows(): MergedRow[] {
  const byKey = new Map<string, MergedRow>();
  for (const row of SHEET_ROWS) {
    const key = normalize(row.name);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        category: row.category,
        name: row.name,
        level: row.level,
        pappa: row.pappa,
        meg: row.meg,
        kommentar: row.kommentar,
        images: row.image ? [row.image] : [],
      });
    } else {
      existing.pappa = row.pappa === null ? existing.pappa
        : (existing.pappa ?? 0) + row.pappa;
      existing.meg = row.meg === null ? existing.meg
        : (existing.meg ?? 0) + row.meg;
      if (row.kommentar) {
        existing.kommentar = existing.kommentar
          ? `${existing.kommentar} ${row.kommentar}` : row.kommentar;
      }
      if (row.image) existing.images.push(row.image);
    }
  }
  return [...byKey.values()];
}

function buildInventory(toolId: string, row: MergedRow): InventoryItem[] {
  const items: InventoryItem[] = [];
  const makeItem = (location: 'mine' | 'parents', index: number, seq: number): InventoryItem => ({
    id: `${toolId}-sheet-${location === 'parents' ? 'p' : 'm'}${index + 1}`,
    location,
    name: row.name,
    image: row.images[seq] ?? row.images[0] ?? '',
    url: null,
    shop: null,
    price: null,
  });
  let seq = 0;
  for (let i = 0; i < (row.pappa ?? 0); i++) items.push(makeItem('parents', i, seq++));
  for (let i = 0; i < (row.meg ?? 0); i++) items.push(makeItem('mine', i, seq++));
  return items;
}

export interface SheetImportResult {
  updated: number;
  created: number;
}

// Navn (og alias-mål) for alt som finnes i regnearket. Brukes til å finne
// verktøy i databasen som IKKE stammer fra regnearket.
function buildSheetNameSet(): Set<string> {
  const keep = new Set<string>();
  for (const row of mergeRows()) keep.add(normalize(row.name));
  for (const alias of Object.values(NAME_ALIASES)) keep.add(alias);
  return keep;
}

export function findToolsNotInSheet(existingTools: Tool[]): Tool[] {
  const keep = buildSheetNameSet();
  return existingTools.filter((t) => !keep.has(normalize(t.name)));
}

export interface CleanupResult {
  removed: number;
  removedNames: string[];
}

/**
 * Sletter permanent alle verktøy i databasen som ikke finnes i
 * verktoyoversikt-regnearket (basert på navn/alias). Engangsopprydding —
 * kalles kun manuelt fra Innstillinger, aldri automatisk.
 */
export async function cleanupNonSheetTools(existingTools: Tool[]): Promise<CleanupResult> {
  const toRemove = findToolsNotInSheet(existingTools);
  if (toRemove.length === 0) return { removed: 0, removedNames: [] };

  const batch = writeBatch(db);
  for (const t of toRemove) batch.delete(doc(db, 'tools', t.id));
  await batch.commit();

  return { removed: toRemove.length, removedNames: toRemove.map((t) => t.name) };
}

/**
 * Skriver dataene fra verktoyoversikt-regnearket inn i Firestore.
 * Kjøres automatisk én gang (styrt av meta/sheetImport-dokumentet);
 * med force=true kjøres den på nytt. Importen er idempotent: verktøy
 * matches på navn og beholdningsrader får deterministiske id-er.
 */
export async function runSheetImport(
  existingTools: Tool[],
  force = false
): Promise<SheetImportResult | null> {
  const meta = await getDoc(importMetaDoc);
  const doneVersion = meta.exists() ? (meta.data().version as number) ?? 0 : 0;
  if (doneVersion >= SHEET_IMPORT_VERSION && !force) return null;

  const byName = new Map<string, Tool>();
  for (const t of existingTools) byName.set(normalize(t.name), t);

  const batch = writeBatch(db);
  let updated = 0;
  let created = 0;

  for (const row of mergeRows()) {
    const key = normalize(row.name);
    const target = byName.get(key) ?? byName.get(NAME_ALIASES[key] ?? '');
    const counted = row.pappa !== null || row.meg !== null;
    const type = row.level === 'avansert' ? 'advanced'
      : row.level === 'basic' ? 'basic'
      : target?.type ?? 'basic';

    if (target) {
      const tool: Tool = {
        ...target,
        name: row.name,
        type,
        image: row.images[0] ?? target.image ?? '',
        notes: row.kommentar || target.notes,
        // Radene med tall er ferske tellinger og erstatter gammel beholdning;
        // rader uten tall lar eksisterende beholdning stå urørt.
        inventory: counted ? buildInventory(target.id, row) : target.inventory,
        inventoryDone: counted ? true : target.inventoryDone,
      };
      batch.set(doc(db, 'tools', tool.id), tool);
      updated++;
    } else {
      const id = `sheet-${slugify(row.name)}`;
      const tool: Tool = {
        id,
        name: row.name,
        category: row.category,
        type,
        inventoryDone: counted,
        inventory: buildInventory(id, row),
        candidates: [],
        chosen: null,
        notes: row.kommentar,
        image: row.images[0] ?? '',
      };
      batch.set(doc(db, 'tools', id), tool);
      created++;
    }
  }

  batch.set(importMetaDoc, {
    version: SHEET_IMPORT_VERSION,
    importedAt: new Date().toISOString(),
  });
  await batch.commit();
  return { updated, created };
}
