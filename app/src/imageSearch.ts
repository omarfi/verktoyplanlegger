export interface ImageSearchResult {
  url: string;
  thumb: string;
  title: string;
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
    throw new Error('Google Search credentials mangler');
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
      throw new Error(`Google image search feilet med HTTP ${response.status}`);
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
  } catch {
    throw new Error('Google image search feilet');
  }
}
