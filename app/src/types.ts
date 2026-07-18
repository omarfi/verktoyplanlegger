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
  /** Generell thumbnail for verktøyet, uavhengig av om man disponerer noe. */
  image: string;
  /** Fysiske eksemplarer man faktisk disponerer; beholdning per hus telles fra disse. */
  instances: ToolInstance[];
  /** Manuell overstyring av behov; null = automatisk utledet. */
  needOverride: Record<House, number | null>;
  notes: string;
  /** Skjemaversjon for Firestore-dokumentet. */
  v: 4;
}

export interface NewToolInput {
  name: string;
  category: string;
  type: ToolType;
  image?: string;
  notes?: string;
  owner?: House | null;
}

export type SyncStatus = 'loading' | 'saving' | 'saved' | 'offline' | 'error';
