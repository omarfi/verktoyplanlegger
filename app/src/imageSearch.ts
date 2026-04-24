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

  const proxyBase = import.meta.env.VITE_IMAGE_SEARCH_PROXY_URL as string | undefined;
  if (!proxyBase) {
    throw new ImageSearchError('VITE_IMAGE_SEARCH_PROXY_URL mangler i deploy-miljøet');
  }

  const params = new URLSearchParams({
    q,
    num: String(Math.min(Math.max(limit, 1), 40)),
  });

  const requestUrl = `${proxyBase.replace(/\/$/, '')}/search?${params.toString()}`;

  let response: Response;
  try {
    response = await fetch(requestUrl, {
      mode: 'cors',
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    await new Promise((r) => setTimeout(r, 400));
    response = await fetch(requestUrl, {
      mode: 'cors',
      signal: AbortSignal.timeout(30000),
    });
  }

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
