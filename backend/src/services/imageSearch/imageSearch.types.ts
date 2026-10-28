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
}

export interface IImageSearchProvider {
  readonly name: string;
  searchImage(query: string, timeoutMs?: number): Promise<ImageSearchResult | null>;
}
