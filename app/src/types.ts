export type House = 'osterliveien' | 'raschsvei';

export type ToolType = 'basis' | 'avansert';

export type PurchaseAvailability = 'in_stock' | 'out_of_stock' | 'unknown';

/** Et butikkprodukt som vurderes for et planlagt innkjøp. */
export interface PurchaseOption {
  id: string;
  url: string;
  canonicalUrl: string;
  retailer: string;
  productName: string;
  imageUrl: string;
  /** Pris i øre. null betyr at butikken ikke oppga en lesbar pris. */
  priceMinor: number | null;
  currency: 'NOK';
  availability: PurchaseAvailability;
  fetchedAt: string;
}

/** Stabilt øyeblikksbilde av produktet som faktisk ble anskaffet. */
export interface PurchaseSnapshot {
  optionId: string;
  url: string;
  retailer: string;
  productName: string;
  priceMinor: number | null;
  currency: 'NOK';
  acquiredAt: string;
}

/** Ett fysisk eksemplar av et verktøy, med egen lokasjon og thumbnail. */
export interface ToolInstance {
  id: string;
  location: House;
  image: string;   // thumbnail-URL, kan være ''
  label: string;   // valgfritt merke/variant, f.eks. 'Bahco', kan være ''
  /** Planlagt destinasjon. Lokasjonen endres først når flyttingen bekreftes. */
  moveTo?: House | null;
  purchase?: PurchaseSnapshot;
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
  /** Kjøp utsatt til senere per hus; utelates fra den aktive handlelisten. */
  postponed: Record<House, boolean>;
  /** Delte produktalternativer; endelig valg gjøres separat per hus. */
  purchaseOptions: PurchaseOption[];
  selectedPurchaseOption: Record<House, string | null>;
  notes: string;
  /** Skjemaversjon for Firestore-dokumentet. */
  v: 5;
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
