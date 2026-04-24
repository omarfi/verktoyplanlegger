export interface ImageSearchResult {
  url: string;
  thumb: string;
  title: string;
}

export class GoogleImageSearchError extends Error {
  status?: number;
  consumerProject?: string;

  constructor(message: string, status?: number, consumerProject?: string) {
    super(message);
    this.name = 'GoogleImageSearchError';
    this.status = status;
    this.consumerProject = consumerProject;
  }
}

interface GoogleCseResponse {
  items?: Array<{
    link?: string;
    title?: string;
    image?: {
      thumbnailLink?: string;
    };
  }>;
}

export async function searchImages(query: string, limit = 20): Promise<ImageSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  return await searchImagesViaGoogleCse(q, limit);
}

async function searchImagesViaGoogleCse(query: string, limit: number): Promise<ImageSearchResult[]> {
  const apiKey = import.meta.env.VITE_GOOGLE_CSE_API_KEY as string | undefined;
  const cx = import.meta.env.VITE_GOOGLE_CSE_CX as string | undefined;
  if (!apiKey || !cx) {
    throw new GoogleImageSearchError('Google Search credentials mangler');
  }

  const params = new URLSearchParams({
    key: apiKey,
    cx,
    q: query,
    searchType: 'image',
    num: String(Math.min(Math.max(limit, 1), 10)),
    safe: 'active',
  });

  try {
    const response = await fetch(`https://customsearch.googleapis.com/customsearch/v1?${params.toString()}`, {
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) {
      let detail = '';
      let consumerProject: string | undefined;
      try {
        const body = await response.json() as {
          error?: {
            message?: string;
            details?: Array<{
              metadata?: {
                consumer?: string;
              };
            }>;
          };
        };
        detail = body.error?.message ? `: ${body.error.message}` : '';
        consumerProject = body.error?.details?.find((d) => d.metadata?.consumer)?.metadata?.consumer;
      } catch {
        // ignore parse errors
      }
      throw new GoogleImageSearchError(
        `Google image search feilet (${response.status})${detail}`,
        response.status,
        consumerProject,
      );
    }

    const data = (await response.json()) as GoogleCseResponse;
    return (data.items ?? [])
      .map((item) => {
        const url = item.link;
        const thumb = item.image?.thumbnailLink ?? item.link;
        if (!url || !thumb) return null;
        return {
          url,
          thumb,
          title: item.title ?? 'Bilde',
        } satisfies ImageSearchResult;
      })
      .filter((x): x is ImageSearchResult => Boolean(x));
  } catch (err) {
    if (err instanceof GoogleImageSearchError) throw err;
    if (err instanceof Error) throw new GoogleImageSearchError(err.message);
    throw new GoogleImageSearchError('Google image search feilet');
  }
}
