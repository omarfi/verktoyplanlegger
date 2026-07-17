export type House = 'osterliveien' | 'raschsvei';

export type ToolType = 'basis' | 'avansert';

export interface Tool {
  id: string;
  name: string;
  category: string;
  type: ToolType;
  /** Beholdning per hus. */
  counts: Record<House, number>;
  /** Manuell overstyring av behov; null = automatisk utledet. */
  needOverride: Record<House, number | null>;
  /** Miniatyrbilder (URL-er), ett per fysisk eksemplar der det finnes. */
  images: string[];
  notes: string;
  /** Skjemaversjon for Firestore-dokumentet. */
  v: 2;
}
