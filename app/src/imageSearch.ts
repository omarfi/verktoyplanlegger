export interface ImageSearchResult {
  url: string;
  thumb: string;
  title: string;
}

interface SerpApiResponse {
  error?: string;
  images_results?: Array<{
    original?: string;
    thumbnail?: string;
    title?: string;
  }>;
}

export class ImageSearchError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ImageSearchError';
    this.status = status;
  }
}

export async function searchImages(query: string, limit = 24): Promise<ImageSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const apiKey = import.meta.env.VITE_SERP_API_KEY as string | undefined;
  if (!apiKey) {
    throw new ImageSearchError('SERP API key mangler i deploy-miljøet');
  }

  const params = new URLSearchParams({
    engine: 'google_images',
    api_key: apiKey,
    google_domain: 'google.no',
    q,
    hl: 'no',
    gl: 'no',
    location: 'Oslo, Oslo, Norway',
    num: String(Math.min(Math.max(limit, 1), 40)),
    output: 'json',
  });

  const response = await fetch(`https://serpapi.com/search?${params.toString()}`, {
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    let message = `Bildesøk feilet (${response.status})`;
    try {
      const err = await response.json() as { error?: string };
      if (err.error) message = err.error;
    } catch {
      // ignore
    }
    throw new ImageSearchError(message, response.status);
  }

  const data = (await response.json()) as SerpApiResponse;
  if (data.error) {
    throw new ImageSearchError(data.error);
  }

  return (data.images_results ?? [])
    .map((item) => {
      const url = item.original;
      const thumb = item.thumbnail ?? item.original;
      if (!url || !thumb) return null;
      return {
        url,
        thumb,
        title: item.title ?? 'Bilde',
      } satisfies ImageSearchResult;
    })
    .filter((x): x is ImageSearchResult => Boolean(x));
}
