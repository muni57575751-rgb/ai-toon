export type EntityCategory =
  | 'person'
  | 'institution'
  | 'place'
  | 'scientific'
  | 'technical'
  | 'other';

export interface ImageSearchResult {
  id: string;
  title: string;
  imageUrl: string;
  thumbnailUrl: string;
  sourcePageUrl: string;
  author: string;
  license: string;
  licenseUrl?: string;
  attribution?: string;
  width?: number;
  height?: number;
  mime?: string;
  sourceType: 'wikimedia' | 'openverse';
  entityCategory?: EntityCategory;
}

export interface ImageSearchOptions {
  entityCategory?: EntityCategory;
  entityName?: string;
  secondaryContext?: string;
  timeoutMs?: number;
  excludeIdentifiers?: string[];
}

export interface IImageSearchProvider {
  readonly name: string;
  searchImage(query: string, options?: ImageSearchOptions): Promise<ImageSearchResult | null>;
  searchImages?(query: string, options?: ImageSearchOptions, limit?: number): Promise<ImageSearchResult[]>;
}
