import type { Tool } from './types';

const SEED_CATEGORIES: Record<string, string[]> = {
  'Måleverktøy': [
    'Tommestokk', 'Målebånd', 'Vater (kort)', 'Vater (lang)',
    'Laservater', 'Skyvelære', 'Vinkelhake / Tømrer-vinkel',
    'Vinkelmåler', 'Merkesnor (snorslå)', 'Linjal / Stållinjal',
    'Dybde-/høydemåler',
  ],
  'Merkeverktøy': [
    'Snekkerblyant', 'Merkepenn', 'Rissenål',
    'Merkekniv', 'Merkesnor med kritt',
  ],
  'Skrutrekkere og bits': [
    'Stjerneskrutrekkere', 'Flate skrutrekkere',
    'Torx-skrutrekkere', 'Presisjonsskrutrekkere',
    'Bitsholder med bitsett',
  ],
  'Nøkler': [
    'Skiftenøkkel', 'Rørnøkkel', 'Kombinasjonsnøkler',
    'Momentnøkkel', 'Unbrakonøkkel', 'Torxnøkler',
  ],
  'Tenger': [
    'Universaltang', 'Nebbtang', 'Avbitertang',
    'Vannpumpetang', 'Spisstang', 'Endekuttingstang', 'Låsetang',
  ],
  'Klemmer og tvinger': [
    'Skrutvinge', 'Hurtigtvinge', 'C-klemme',
    'Hjørnetvinge', 'Fjærklemme', 'Limklemme', 'Bordklemme',
  ],
  'Skjæreverktøy': [
    'Håndsag', 'Baufil', 'Gjæringssag',
    'Tapetkniv / hobbykniv', 'Pussekniv', 'Filsett',
    'Blikksaks', 'Saks', 'Hullemaker / hullsag', 'Meisel',
  ],
  'Slagverktøy': [
    'Hammer', 'Snekkerhammer', 'Gummihammer / klubbe',
    'Kulehammer', 'Murehammer', 'Meiselhammer',
  ],
  'Åpne- og riveverktøy': [
    'Brekkjern', 'Liten brekkstang', 'Spett',
    'Spikertrekker', 'Meisel (bryte)', 'Dørkiler',
  ],
  'Slipeverktøy': [
    'Sandpapir', 'Slipekloss', 'Pussekloss med skum',
    'Stålull', 'Tre- og metallfiler',
  ],
  'Elektrisk håndverktøy': [
    'Avisoleringstang', 'Avmantlingstang', 'Kabelkutter',
    'Spenningssøker (manuell)', 'Isolerte skrutrekkere',
    'Kombiverktøy (elektro)',
  ],
  'Rengjøring og vedlikehold': [
    'Stålbørste', 'Messingbørste', 'Pensel',
    'Mikrofiberklut', 'Magnetplukk-verktøy',
  ],
  'Oppbevaring': [
    'Verktøykasse', 'Sortimentsbokser',
    'Magnetlister', 'Skuffesystemer',
  ],
  'Arbeidslys': [
    'Hodelykt', 'Bærbart arbeidslys',
    'Inspeksjonslys / pennelykt', 'Knekklys / LED-rør',
    'Magnetisk lys', 'Lys med krok / klemme',
  ],
};

const BASIC_TOOLS = new Set([
  'Tommestokk', 'Målebånd', 'Vater (kort)',
  'Snekkerblyant', 'Merkepenn',
  'Stjerneskrutrekkere', 'Flate skrutrekkere', 'Bitsholder med bitsett',
  'Skiftenøkkel', 'Unbrakonøkkel', 'Kombinasjonsnøkler',
  'Universaltang', 'Nebbtang', 'Avbitertang', 'Vannpumpetang',
  'Hurtigtvinge', 'Fjærklemme',
  'Håndsag', 'Tapetkniv / hobbykniv', 'Saks',
  'Hammer', 'Gummihammer / klubbe',
  'Brekkjern', 'Spikertrekker',
  'Sandpapir', 'Slipekloss',
  'Spenningssøker (manuell)', 'Isolerte skrutrekkere',
  'Stålbørste', 'Pensel', 'Mikrofiberklut',
  'Verktøykasse',
  'Hodelykt',
]);

let idCounter = 0;

export function generateSeedTools(): Tool[] {
  const tools: Tool[] = [];
  for (const [category, items] of Object.entries(SEED_CATEGORIES)) {
    for (const name of items) {
      tools.push({
        id: `tool-${++idCounter}`,
        name,
        category,
        type: BASIC_TOOLS.has(name) ? 'basic' : 'advanced',
        inventoryDone: false,
        inventory: [],
        candidates: [],
        chosen: null,
        notes: '',
      });
    }
  }
  return tools;
}

export function getCategoryOrder(): string[] {
  return Object.keys(SEED_CATEGORIES);
}
