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

interface WikimediaQueryResponse {
  query?: {
    pages?: Record<string, {
      title: string;
      imageinfo?: Array<{
        url?: string;
        thumburl?: string;
      }>;
    }>;
  };
}

export async function searchImages(query: string, limit = 20): Promise<ImageSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const cseResults = await searchImagesViaGoogleCse(q, limit);
  if (cseResults.length > 0) return cseResults;

  return await searchImagesViaWikimedia(q, limit);
}

async function searchImagesViaGoogleCse(query: string, limit: number): Promise<ImageSearchResult[]> {
  const apiKey = import.meta.env.VITE_GOOGLE_CSE_API_KEY as string | undefined;
  const cx = import.meta.env.VITE_GOOGLE_CSE_CX as string | undefined;
  if (!apiKey || !cx) return [];

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
    if (!response.ok) return [];

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
    return [];
  }
}

async function searchImagesViaWikimedia(query: string, limit: number): Promise<ImageSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrsearch: `${q} filetype:bitmap`,
    gsrlimit: String(Math.min(limit, 50)),
    gsrnamespace: '6',
    prop: 'imageinfo',
    iiprop: 'url',
    iiurlwidth: '360',
    origin: '*',
  });

  const url = `https://commons.wikimedia.org/w/api.php?${params.toString()}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) {
    throw new Error(`Image search failed with HTTP ${response.status}`);
  }

  const data = (await response.json()) as WikimediaQueryResponse;
  const pages = Object.values(data.query?.pages ?? {});

  return pages
    .map((p) => {
      const info = p.imageinfo?.[0];
      const source = info?.url;
      const thumb = info?.thumburl ?? source;
      if (!source || !thumb) return null;
      return {
        url: source,
        thumb,
        title: p.title.replace(/^File:/, ''),
      } satisfies ImageSearchResult;
    })
    .filter((x): x is ImageSearchResult => Boolean(x));
}
