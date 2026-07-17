import { collection, doc, getDoc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import type { Tool, ToolInstance, House } from './types';
import { generateId } from './logic';

const MIGRATION_VERSION = 4;
const migrationDoc = doc(db, 'meta', 'migration');

interface LegacyInventoryItem {
  location?: string;
  image?: string;
  name?: string;
}

interface LegacyToolFields {
  // v1
  inventory?: LegacyInventoryItem[];
  candidates?: { image?: string }[];
  image?: string;
  // v2
  counts?: Record<string, number>;
  images?: string[];
}

function instance(location: House, image = '', label = ''): ToolInstance {
  return { id: generateId(), location, image, label };
}

function normalizeInstances(arr: unknown[]): ToolInstance[] {
  return (arr as ToolInstance[]).map((i) => ({
    id: i.id || generateId(),
    location: i.location === 'osterliveien' ? 'osterliveien' : 'raschsvei',
    image: i.image ?? '',
    label: i.label ?? '',
  }));
}

function normalizeType(raw: unknown): Tool['type'] {
  return raw === 'advanced' || raw === 'avansert' ? 'avansert' : 'basis';
}

/**
 * Mapper et Firestore-dokument (v1, v2, v3 eller v4) til v4-modellen.
 * Brukes både i onSnapshot (så UI-et alltid ser v4-formen) og i den
 * engangs skrivemigreringen.
 *
 * Viktig: et bilde betyr IKKE at man disponerer et eksemplar. Eksemplarer
 * lages kun fra faktiske beholdningstall/inventar; øvrige bilder legges som
 * generell thumbnail på verktøyet.
 */
export function migrateTool(raw: Record<string, unknown>): Tool {
  const base = {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    category: String(raw.category ?? 'Annet'),
    type: normalizeType(raw.type),
    notes: typeof raw.notes === 'string' ? raw.notes : '',
    needOverride: {
      osterliveien: (raw.needOverride as Record<string, number | null>)?.osterliveien ?? null,
      raschsvei: (raw.needOverride as Record<string, number | null>)?.raschsvei ?? null,
    },
    image: typeof raw.image === 'string' ? raw.image : '',
    v: 4 as const,
  };

  // v4: normaliser, behold alt.
  if (raw.v === 4 && Array.isArray(raw.instances)) {
    return { ...base, instances: normalizeInstances(raw.instances) };
  }

  // v3: REPARASJON. Migreringen laget feilaktig spøkelses-eksemplarer fra
  // thumbnails, og de havnet alltid på Raschs Vei. Behold Østerliveien-
  // eksemplarene (ekte, laget kun fra faktiske tall), fjern Raschs Vei, og
  // løft et bilde til generell thumbnail så kortet fortsatt viser et bilde.
  if (raw.v === 3 && Array.isArray(raw.instances)) {
    const all = normalizeInstances(raw.instances);
    const kept = all.filter((i) => i.location === 'osterliveien');
    const image = base.image || all.find((i) => i.image)?.image || '';
    return { ...base, instances: kept, image };
  }

  const legacy = raw as LegacyToolFields;

  // v1: inventory[] = faktiske eksemplarer med lokasjon; tool.image = generell.
  if (Array.isArray(legacy.inventory)) {
    const instances = legacy.inventory.map((item) =>
      instance(
        item.location === 'parents' ? 'osterliveien' : 'raschsvei',
        item.image || '',
        item.name || ''
      )
    );
    const image = base.image || legacy.candidates?.find((c) => c.image)?.image || '';
    return { ...base, instances, image };
  }

  // v2: counts + images → eksemplarer KUN fra counts; resterende bilder blir
  // generell thumbnail (aldri spøkelses-eksemplarer).
  const counts = legacy.counts ?? {};
  const images = Array.isArray(legacy.images) ? legacy.images.filter(Boolean) : [];
  const instances: ToolInstance[] = [];
  let imgIdx = 0;
  const houses: House[] = ['osterliveien', 'raschsvei'];
  for (const house of houses) {
    const n = Number(counts[house]) || 0;
    for (let k = 0; k < n; k++) instances.push(instance(house, images[imgIdx++] ?? ''));
  }
  const image = base.image || images[imgIdx] || images[0] || legacy.image || '';
  return { ...base, instances, image };
}

/**
 * Engangs skrivemigrering til v4 (styrt av meta/migration-dokumentet):
 * skriver alle verktøy om til den nye formen og rydder bort kits og
 * gamle meta-dokumenter. Idempotent uansett hvilken versjon prod har.
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
