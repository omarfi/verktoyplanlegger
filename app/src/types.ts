export interface InventoryItem {
  id: string;
  location: 'mine' | 'parents' | 'unknown';
  name: string;
  image: string;
  url: string | null;
  shop: string | null;
  price: number | null;
}

export interface ProductCandidate {
  id: string;
  name: string;
  image: string;
  productUrl: string;
  shop: string;
  price: number;
  articleNumber: string | null;
}

export interface Tool {
  id: string;
  name: string;
  category: string;
  type: 'basic' | 'advanced';
  inventoryDone: boolean;
  inventory: InventoryItem[];
  candidates: ProductCandidate[];
  chosen: number | null;
  notes: string;
}

export interface Kit {
  id: string;
  name: string;
  productUrl: string;
  image: string;
  shop: string;
  price: number;
  contents: string[]; // tool IDs
}

export interface AppState {
  tools: Tool[];
  kits: Kit[];
  preferredShops: Shop[];
}

export interface Shop {
  id: string;
  name: string;
  url: string;
}

export type ToolStatus = 'new' | 'gap' | 'shopping' | 'done' | 'move';

export type FilterStatus = 'all' | 'new' | 'gap' | 'shopping' | 'done';

export interface GapResult {
  mine: boolean;
  parents: boolean | null;
  needsBuy: string[];
  needsMove: string | null;
}
