export interface GeneratedImage {
  id: number;
  url: string;
  timestamp: number;
  prompt: string;
  type: 'background' | 'composition';
  styleName: string;
  ratioLabel: string;
  productName?: string;
  /** Etykieta wersji kolorystycznej (np. "Czerwony", "Wersja 1") – do nazw plików. */
  variantLabel?: string;
  /** Id formatu (np. "1:1") – do ponownego generowania. */
  ratioId?: string;
  /** Indeks wersji produktu – do ponownego generowania. */
  variantIndex?: number;
}

export interface GeneratedReel {
  id: number;
  url: string;
  timestamp: number;
  prompt: string;
  productName?: string;
}

export enum AppMode {
  PRODUCT_PLACEMENT = 'PRODUCT_PLACEMENT'
}

export type AppTab = 'arrangement' | 'reel';

export type LightingType = 'natural' | 'studio' | 'warm' | 'dramatic';
export type ShadowType = 'soft' | 'hard' | 'dynamic';

/** Rozdzielczość wyjściowa (Gemini 3 Pro Image). */
export type ImageResolution = '1K' | '2K' | '4K';

export interface EnhancementOptions {
  lighting: LightingType;
  shadows: ShadowType;
  autoColorMatch: boolean;
}

export interface GenerationConfig {
  prompt: string;
  productImageBase64?: string;
  mode: AppMode;
  enhancements?: EnhancementOptions;
}

export interface InteriorStyle {
  id: string;
  name: string;
  category: 'Living' | 'Kids';
  description: string;
  prompt: string;
  /** URL przykładowego obrazka tła (miniatura) – do wizualnego wyboru stylu. */
  imageUrl?: string;
}

export interface AspectRatioItem {
  id: string; // The value sent to API (e.g., "1:1", "3:4")
  label: string;
  category: 'E-commerce' | 'Social Media';
  description: string;
  usageTip: string;
}