export interface ImageSearchResult {
  url: string;
  thumb: string;
  title: string;
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
