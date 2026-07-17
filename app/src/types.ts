export type House = 'osterliveien' | 'raschsvei';

export type ToolType = 'basis' | 'avansert';

/** Ett fysisk eksemplar av et verktøy, med egen lokasjon og thumbnail. */
export interface ToolInstance {
  id: string;
  location: House;
  image: string;   // thumbnail-URL, kan være ''
  label: string;   // valgfritt merke/variant, f.eks. 'Bahco', kan være ''
}

export interface Tool {
  id: string;
  name: string;
  category: string;
  type: ToolType;
  /** Alle fysiske eksemplarer; beholdning per hus utledes ved å telle disse. */
  instances: ToolInstance[];
  /** Manuell overstyring av behov; null = automatisk utledet. */
  needOverride: Record<House, number | null>;
  notes: string;
  /** Skjemaversjon for Firestore-dokumentet. */
  v: 3;
}
