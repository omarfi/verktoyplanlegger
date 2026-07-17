import { collection, doc, getDoc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import type { Tool, ToolInstance, House } from './types';
import { generateId } from './logic';

const MIGRATION_VERSION = 3;
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

function normalizeType(raw: unknown): Tool['type'] {
  return raw === 'advanced' || raw === 'avansert' ? 'avansert' : 'basis';
}

/**
 * Mapper et Firestore-dokument (v1, v2 eller v3) til v3-modellen.
 * Brukes både i onSnapshot (så UI-et alltid ser v3-formen) og i den
 * engangs skrivemigreringen.
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
    v: 3 as const,
  };

  // v3: normaliser instanser.
  if (raw.v === 3 && Array.isArray(raw.instances)) {
    const instances = (raw.instances as ToolInstance[]).map((i) => ({
      id: i.id || generateId(),
      location: i.location === 'osterliveien' ? 'osterliveien' : 'raschsvei',
      image: i.image ?? '',
      label: i.label ?? '',
    }) as ToolInstance);
    return { ...base, instances };
  }

  const legacy = raw as LegacyToolFields;

  // v1: legacy inventory[] — bevarer lokasjon↔bilde-paring per eksemplar.
  if (Array.isArray(legacy.inventory)) {
    const instances = legacy.inventory.map((item) =>
      instance(
        item.location === 'parents' ? 'osterliveien' : 'raschsvei',
        item.image || '',
        item.name || ''
      )
    );
    return { ...base, instances };
  }

  // v2: counts + images → bygg eksemplarer, fordel bilder sekvensielt.
  const counts = legacy.counts ?? {};
  const images = Array.isArray(legacy.images) ? legacy.images.filter(Boolean) : [];
  const instances: ToolInstance[] = [];
  let imgIdx = 0;
  const houses: House[] = ['osterliveien', 'raschsvei'];
  for (const house of houses) {
    const n = Number(counts[house]) || 0;
    for (let k = 0; k < n; k++) {
      instances.push(instance(house, images[imgIdx++] ?? ''));
    }
  }
  // Overskytende bilder (flere bilder enn eksemplarer) beholdes som ekstra
  // eksemplarer på Raschs Vei, så ingen thumbnail går tapt.
  while (imgIdx < images.length) {
    instances.push(instance('raschsvei', images[imgIdx++]));
  }
  // Verktøy uten counts og uten bilder, men med gammelt tool.image.
  if (instances.length === 0 && legacy.image) {
    instances.push(instance('raschsvei', legacy.image));
  }

  return { ...base, instances };
}

/**
 * Engangs skrivemigrering til v3 (styrt av meta/migration-dokumentet):
 * skriver alle verktøy om til den nye formen og rydder bort kits og
 * gamle meta-dokumenter. Idempotent uansett om prod allerede er v2.
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
