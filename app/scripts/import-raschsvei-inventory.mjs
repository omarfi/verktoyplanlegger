/**
 * Engangsimport av Omars beholdning (Raschs Vei) til Firestore.
 *
 * Kjøres i nettleseren mens du er på den publiserte appen (samme origin som er
 * en autorisert Firebase-domene), innlogget-domenet er allerede satt opp der.
 * Skriving krever Google-innlogging som omar1490@gmail.com – akkurat som appen.
 *
 * Slik kjører du den:
 *   1. Åpne den publiserte appen i nettleseren.
 *   2. Åpne DevTools-konsollen.
 *   3. Lim inn:  import('/verktoyplanlegger/scripts/import-raschsvei-inventory.mjs')
 *      (eller kopier hele denne filen inn i konsollen).
 *   4. Godkjenn Google-innlogging med Omar-kontoen i popup-en.
 *
 * Skriptet er IDEMPOTENT: det «topper opp» beholdningen til måltallet i planen
 * i stedet for å legge til blindt, så det er trygt å kjøre flere ganger.
 * `raschsvei-inventory.json` (samme mappe) er den menneskelesbare planen.
 */

const SDK = 'https://www.gstatic.com/firebasejs/12.12.1';
const { initializeApp } = await import(`${SDK}/firebase-app.js`);
const { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } = await import(
  `${SDK}/firebase-auth.js`
);
const { getFirestore, collection, getDocs, doc, writeBatch } = await import(
  `${SDK}/firebase-firestore.js`
);

const firebaseConfig = {
  apiKey: 'AIzaSyB60MOAX5FhrL8kk6vo5VNEJ3tcsMHOfmM',
  authDomain: 'studio-3228592052-d52e3.firebaseapp.com',
  projectId: 'studio-3228592052-d52e3',
  storageBucket: 'studio-3228592052-d52e3.firebasestorage.app',
  messagingSenderId: '901049617430',
  appId: '1:901049617430:web:acc9211a9268c864f8f937',
};

const ALLOWED_EMAIL = 'omar1490@gmail.com';
const LOCATION = 'raschsvei';

// Planen. Speiler nøyaktig raschsvei-inventory.json i samme mappe.
const PLAN = {
  matches: [
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
  ],
  news: [
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
  ],
};

// Samme normalisering som appen (logic.ts) for navnematching.
function normalize(value = '') {
  return value
    .toLocaleLowerCase('nb')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ø/g, 'o')
    .replace(/æ/g, 'ae')
    .trim();
}

let idCounter = 0;
function generateId() {
  // Unik selv når mange lages på samme millisekund.
  return `${Date.now()}-${(idCounter++).toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function makeInstance(label = '') {
  return { id: generateId(), location: LOCATION, image: '', label, moveTo: null };
}

function countAt(tool, house) {
  return (tool.instances || []).filter((i) => i.location === house).length;
}

function appendNote(existing, note) {
  if (!note) return existing || '';
  const cur = (existing || '').trim();
  if (!cur) return note;
  if (normalize(cur).includes(normalize(note))) return cur; // idempotent
  return `${cur}\n${note}`;
}

const app = initializeApp(firebaseConfig, `import-${Date.now()}`);
const auth = getAuth(app);
const db = getFirestore(app);

async function currentUser() {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (u) => {
      unsub();
      resolve(u);
    });
  });
}

async function run() {
  let user = await currentUser();
  if (!user) {
    console.log('Logger inn … godkjenn Omar-kontoen i popup-en.');
    const res = await signInWithPopup(auth, new GoogleAuthProvider());
    user = res.user;
  }
  if (!user || user.email !== ALLOWED_EMAIL) {
    throw new Error(`Feil konto: ${user?.email ?? 'ingen'}. Logg inn som ${ALLOWED_EMAIL}.`);
  }

  const snap = await getDocs(collection(db, 'tools'));
  const byId = new Map();
  const byName = new Map();
  snap.forEach((d) => {
    const data = { id: d.id, ...d.data() };
    byId.set(d.id, data);
    byName.set(normalize(data.name || ''), data);
  });

  const batch = writeBatch(db);
  const report = [];
  let writes = 0;

  const topUp = (tool, target, { label, labels, note } = {}) => {
    const have = countAt(tool, LOCATION);
    const toAdd = Math.max(0, target - have);
    if (toAdd === 0 && !note) {
      report.push(`= ${tool.name}: allerede ${have} på Raschs Vei (mål ${target}) – uendret`);
      return;
    }
    const instances = [...(tool.instances || [])];
    for (let k = 0; k < toAdd; k++) {
      const lbl = labels ? labels[have + k] ?? labels[labels.length - 1] ?? '' : label ?? '';
      instances.push(makeInstance(lbl));
    }
    const updated = { ...tool, instances, notes: appendNote(tool.notes, note) };
    delete updated.id; // id ligger i dokumentnavnet, ikke i feltene
    updated.needOverride = tool.needOverride ?? { osterliveien: null, raschsvei: null };
    updated.v = 4;
    batch.set(doc(db, 'tools', tool.id), { id: tool.id, ...updated });
    writes++;
    report.push(
      toAdd > 0
        ? `+ ${tool.name}: ${have} → ${have + toAdd} på Raschs Vei`
        : `~ ${tool.name}: notat oppdatert`
    );
  };

  // 1) Kjente treff – legg på eksemplar(er) hos Omar.
  for (const m of PLAN.matches) {
    const tool = byId.get(m.id) || byName.get(normalize(m.name));
    if (!tool) {
      report.push(`! Fant ikke eksisterende verktøy for match «${m.name}» (${m.id}) – hoppet over`);
      continue;
    }
    topUp(tool, m.target, m);
  }

  // 2) Nye verktøy – opprett, men gjenbruk hvis navnet alt finnes (idempotent).
  for (const n of PLAN.news) {
    const existing = byName.get(normalize(n.name));
    if (existing) {
      topUp(existing, n.count, { label: n.label, note: n.note });
      continue;
    }
    const instances = [];
    for (let k = 0; k < n.count; k++) instances.push(makeInstance(n.label ?? ''));
    const id = generateId();
    const tool = {
      id,
      name: n.name,
      category: n.category,
      type: n.type,
      image: '',
      instances,
      needOverride: { osterliveien: null, raschsvei: null },
      notes: n.note ?? '',
      v: 4,
    };
    batch.set(doc(db, 'tools', id), tool);
    byName.set(normalize(n.name), tool); // hindrer dobbelt-opprettelse i samme kjøring
    writes++;
    report.push(`★ NY ${n.name} (${n.category}): ${n.count} på Raschs Vei`);
  }

  if (writes === 0) {
    console.log('Ingenting å skrive – alt er allerede på plass.');
    console.log(report.join('\n'));
    return;
  }

  await batch.commit();
  console.log(`Ferdig. Skrev ${writes} dokument(er).`);
  console.log(report.join('\n'));
}

run().catch((e) => console.error('Import feilet:', e));

export {};
