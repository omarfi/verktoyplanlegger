/* Product extraction via Jina Reader (r.jina.ai) */

export interface ExtractedProduct {
  name: string | null;
  price: number | null;
  image_url: string | null;
  article_number: string | null;
  shop: string | null;
}

/**
 * Fetch page content as clean markdown via Jina Reader.
 * Jina handles JS rendering, anti-bot, and returns CORS-friendly responses.
 */
async function fetchViaJina(url: string): Promise<string> {
  const resp = await fetch(`https://r.jina.ai/${url}`, {
    signal: AbortSignal.timeout(15000),
    headers: {
      'Accept': 'text/plain',
    },
  });
  if (!resp.ok) {
    throw new Error(`Jina Reader returned HTTP ${resp.status}`);
  }
  return await resp.text();
}

function parsePrice(text: string): number | null {
  if (!text) return null;
  // Remove everything except digits, comma, dot, spaces — handle "1 299,00 kr"
  const cleaned = text.replace(/[^\d,.\s]/g, '').trim();
  const withoutSpaces = cleaned.replace(/\s/g, '');
  const normalized = withoutSpaces.replace(',', '.');
  const num = parseFloat(normalized);
  return isNaN(num) ? null : num;
}

/**
 * Extract product info from Jina Reader markdown output.
 * Looks for common patterns in Norwegian product pages.
 */
function extractFromMarkdown(md: string): Partial<ExtractedProduct> {
  const result: Partial<ExtractedProduct> = {};

  // Product name: first H1 heading
  const h1Match = md.match(/^#\s+(.+)$/m);
  if (h1Match) {
    result.name = h1Match[1].trim();
  }

  // Price: look for Norwegian kroner patterns — "1 299,-" "299,00 kr" "kr 299" "NOK 299"
  const pricePatterns = [
    /(\d[\d\s]*\d),[-–]\s/,                    // "1 299,- "
    /(\d[\d\s]*\d)[,.](\d{2})\s*kr/i,         // "1 299,00 kr"
    /(\d[\d\s]*\d)\s*kr/i,                      // "1 299 kr"
    /kr\.?\s*(\d[\d\s]*\d)/i,                   // "kr 1 299" or "kr. 1299"
    /NOK\s*(\d[\d\s]*[\d,]+)/i,                // "NOK 1 299,00"
    /(\d[\d\s]*\d)[,.](\d{2})/,               // "1 299,00" (generic)
  ];
  for (const pattern of pricePatterns) {
    const m = md.match(pattern);
    if (m) {
      const priceText = m[0];
      const price = parsePrice(priceText);
      if (price && price > 0 && price < 100000) {
        result.price = price;
        break;
      }
    }
  }

  // Image: first markdown image or image URL
  const imgMatch = md.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/)
    || md.match(/(https?:\/\/[^\s)]+\.(?:jpg|jpeg|png|webp)(?:\?[^\s)]*)?)/i);
  if (imgMatch) {
    result.image_url = imgMatch[1];
  }

  // Article number: common patterns
  const artPatterns = [
    /[Aa]rt(?:ikkel)?(?:\.?\s*(?:nr|nummer)?\.?\s*):?\s*(\d{4,8})/,
    /[Aa]rticle\s*(?:no|number)?\.?\s*:?\s*(\d{4,8})/,
    /[Vv]arenr\.?\s*:?\s*(\d{4,8})/,
    /[Pp]rodukt(?:nr|nummer)\.?\s*:?\s*(\d{4,8})/,
    /SKU\s*:?\s*(\d{4,8})/i,
  ];
  for (const pattern of artPatterns) {
    const m = md.match(pattern);
    if (m) {
      result.article_number = m[1];
      break;
    }
  }

  return result;
}

/**
 * Extract product info from a URL using Jina Reader.
 */
export async function extractProductFromUrl(url: string): Promise<ExtractedProduct> {
  const shop = detectShopFromUrl(url);
  const result: ExtractedProduct = {
    name: null,
    price: null,
    image_url: isImageUrl(url) ? url : null,
    article_number: null,
    shop,
  };

  if (isImageUrl(url)) return result;

  try {
    const markdown = await fetchViaJina(url);
    console.log('[extract] Jina markdown length:', markdown.length);

    const extracted = extractFromMarkdown(markdown);
    if (extracted.name) result.name = extracted.name;
    if (extracted.price != null) result.price = extracted.price;
    if (extracted.image_url) result.image_url = extracted.image_url;
    if (extracted.article_number) result.article_number = extracted.article_number;

    // Extract article number from URL for Jula (e.g. /meterstokk-014285/)
    if (!result.article_number && shop === 'Jula') {
      const m = url.match(/[-/](\d{6})\/?$/);
      if (m) result.article_number = m[1];
    }

    console.log('[extract] Result:', result);
  } catch (err) {
    console.warn('[extract] Jina Reader failed:', err);
  }

  return result;
}

/**
 * Classify a tool as basic or advanced.
 * TODO: Replace with AI classification
 */
export async function classifyTool(name: string): Promise<'basic' | 'advanced'> {
  console.log('[AI STUB] classifyTool called with:', name);
  return 'advanced';
}

/**
 * Extract kit contents from a URL.
 * TODO: Replace with AI extraction
 */
export async function extractKitContents(url: string): Promise<string[]> {
  console.log('[AI STUB] extractKitContents called with:', url);
  return [];
}

function detectShopFromUrl(url: string): string | null {
  const lower = url.toLowerCase();
  if (lower.includes('jula.no')) return 'Jula';
  if (lower.includes('biltema.no')) return 'Biltema';
  if (lower.includes('clasohlson.no') || lower.includes('clas-ohlson.no')) return 'Clas Ohlson';
  if (lower.includes('byggmax.no')) return 'Byggmax';
  if (lower.includes('obsbygg.no') || lower.includes('obs.no') || lower.includes('obs-bygg.no')) return 'Obs Bygg';
  return null;
}

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|webp|gif|svg)(\?|$)/i.test(url);
}
