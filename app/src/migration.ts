import { collection, doc, getDoc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import type { Tool } from './types';

const MIGRATION_VERSION = 2;
const migrationDoc = doc(db, 'meta', 'migration');

interface LegacyInventoryItem {
  location?: string;
  image?: string;
}

interface LegacyToolFields {
  inventory?: LegacyInventoryItem[];
  candidates?: { image?: string }[];
  image?: string;
}

/**
 * Mapper et Firestore-dokument (v1 eller v2) til v2-modellen.
 * Brukes både i onSnapshot (så UI-et alltid ser v2-formen) og i den
 * engangs skrivemigreringen.
 */
export function migrateTool(raw: Record<string, unknown>): Tool {
  if (raw.v === 2) {
    const t = raw as unknown as Tool;
    return {
      ...t,
      counts: { osterliveien: t.counts?.osterliveien ?? 0, raschsvei: t.counts?.raschsvei ?? 0 },
      needOverride: {
        osterliveien: t.needOverride?.osterliveien ?? null,
        raschsvei: t.needOverride?.raschsvei ?? null,
      },
      images: t.images ?? [],
      notes: t.notes ?? '',
    };
  }

  const legacy = raw as LegacyToolFields;
  const inventory = Array.isArray(legacy.inventory) ? legacy.inventory : [];

  // Gammel logikk regnet eksemplarer uten kjent plassering som "mine" (Raschs Vei).
  const osterliveien = inventory.filter((i) => i.location === 'parents').length;
  const raschsvei = inventory.length - osterliveien;

  const images: string[] = [];
  for (const item of inventory) {
    if (item.image && !images.includes(item.image)) images.push(item.image);
  }
  if (images.length === 0) {
    const fallback = legacy.image || legacy.candidates?.find((c) => c.image)?.image;
    if (fallback) images.push(fallback);
  }

  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    category: String(raw.category ?? 'Annet'),
    type: raw.type === 'advanced' || raw.type === 'avansert' ? 'avansert' : 'basis',
    counts: { osterliveien, raschsvei },
    needOverride: { osterliveien: null, raschsvei: null },
    images,
    notes: typeof raw.notes === 'string' ? raw.notes : '',
    v: 2,
  };
}

/**
 * Engangs skrivemigrering til v2 (styrt av meta/migration-dokumentet):
 * skriver alle verktøy om til den nye formen og rydder bort kits og
 * gamle meta-dokumenter.
 */
export async function runMigration(tools: Tool[]): Promise<void> {
  const meta = await getDoc(migrationDoc);
  const doneVersion = meta.exists() ? ((meta.data().version as number) ?? 0) : 0;
  if (doneVersion >= MIGRATION_VERSION) return;

  const batch = writeBatch(db);
  for (const tool of tools) {
    batch.set(doc(db, 'tools', tool.id), tool);
  }

  const kits = await getDocs(collection(db, 'kits'));
  for (const kit of kits.docs) batch.delete(kit.ref);
  batch.delete(doc(db, 'meta', 'prefs'));
  batch.delete(doc(db, 'meta', 'sheetImport'));

  batch.set(migrationDoc, { version: MIGRATION_VERSION, migratedAt: new Date().toISOString() });
  await batch.commit();
}
