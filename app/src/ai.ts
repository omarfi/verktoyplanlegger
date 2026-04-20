/* AI integration — client-side extraction via CORS proxy + DOM parsing */

export interface ExtractedProduct {
  name: string | null;
  price: number | null;
  image_url: string | null;
  article_number: string | null;
  shop: string | null;
}

/* Shop-specific CSS selectors and extraction logic */
interface ShopConfig {
  nameSelectors: string[];
  priceSelectors: string[];
  imageSelectors: string[];
  articleSelectors: string[];
  /** Custom price parser — some shops format prices oddly */
  parsePrice?: (text: string) => number | null;
}

const SHOP_CONFIGS: Record<string, ShopConfig> = {
  jula: {
    nameSelectors: [
      'h1.product-title', 'h1[data-testid="product-title"]', 'h1.pdp-title',
      '.product-name h1', 'h1', '[class*="productTitle"]', '[class*="product-title"]',
    ],
    priceSelectors: [
      '[data-testid="product-price"]', '.product-price', '.price-now',
      '[class*="currentPrice"]', '[class*="product-price"]', '.price',
      '[class*="Price"]',
    ],
    imageSelectors: [
      '.product-image img', '.pdp-image img', '[data-testid="product-image"] img',
      '.product-gallery img', 'picture img', '.product img',
    ],
    articleSelectors: [
      '[data-testid="article-number"]', '.article-number', '.product-article',
      '[class*="articleNumber"]', '[class*="article-number"]',
    ],
  },
  biltema: {
    nameSelectors: [
      'h1.product-title', 'h1[class*="product"]', '.product-name h1', 'h1',
      '[class*="ProductTitle"]',
    ],
    priceSelectors: [
      '.product-price', '.price-current', '[class*="price"]', '.price',
      '[class*="Price"]',
    ],
    imageSelectors: [
      '.product-image img', '.gallery img', 'picture img', '.product img',
    ],
    articleSelectors: [
      '.article-number', '[class*="articleNumber"]', '[class*="article-number"]',
      '.product-number',
    ],
  },
  clasohlson: {
    nameSelectors: [
      'h1.product-title', 'h1[class*="product"]', '.product-name h1', 'h1',
    ],
    priceSelectors: [
      '.product-price', '[class*="price"]', '.price', '[class*="Price"]',
    ],
    imageSelectors: [
      '.product-image img', '.gallery img', 'picture img', '.product img',
    ],
    articleSelectors: [
      '.article-number', '[class*="artNr"]', '[class*="article"]',
    ],
  },
  byggmax: {
    nameSelectors: [
      'h1.product-title', 'h1[class*="product"]', 'h1', '.product-name h1',
    ],
    priceSelectors: [
      '.product-price', '[class*="price"]', '.price', '[class*="Price"]',
    ],
    imageSelectors: [
      '.product-image img', '.gallery img', 'picture img', '.product img',
    ],
    articleSelectors: [
      '.article-number', '[class*="article"]', '.product-number',
    ],
  },
  obsbygg: {
    nameSelectors: [
      'h1', '[class*="product-title"]', '[class*="ProductTitle"]', '.product-name h1',
    ],
    priceSelectors: [
      '[class*="price"]', '.price', '[class*="Price"]', '.product-price',
    ],
    imageSelectors: [
      '.product-image img', 'picture img', '.product img', '.gallery img',
    ],
    articleSelectors: [
      '[class*="article"]', '[class*="sku"]', '.product-number',
    ],
  },
};

const CORS_PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.cors.lol/?url=${encodeURIComponent(url)}`,
  (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`,
];

async function fetchViaProxy(url: string): Promise<string> {
  const errors: string[] = [];
  for (const proxy of CORS_PROXIES) {
    const proxyUrl = proxy(url);
    try {
      const resp = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
      if (resp.ok) {
        const text = await resp.text();
        // Sanity check: should contain HTML
        if (text.length > 200 && (text.includes('<') || text.includes('html'))) {
          return text;
        }
      }
      errors.push(`${proxyUrl.split('?')[0]}: HTTP ${resp.status}`);
    } catch (e) {
      errors.push(`${proxyUrl.split('/')[2]}: ${e instanceof Error ? e.message : 'failed'}`);
    }
  }
  console.warn('[fetchViaProxy] All proxies failed:', errors);
  throw new Error('All CORS proxies failed');
}

function parsePrice(text: string): number | null {
  if (!text) return null;
  // Remove everything except digits, comma, dot — handle "1 299,00 kr" etc.
  const cleaned = text.replace(/[^\d,.\s]/g, '').trim();
  // Try "1 299,00" or "1299.00" or "1299"
  const withoutSpaces = cleaned.replace(/\s/g, '');
  // Replace comma with dot for decimals
  const normalized = withoutSpaces.replace(',', '.');
  const num = parseFloat(normalized);
  return isNaN(num) ? null : num;
}

function firstMatch(doc: Document, selectors: string[]): string | null {
  for (const sel of selectors) {
    try {
      const el = doc.querySelector(sel);
      if (el) {
        const text = el.textContent?.trim();
        if (text) return text;
      }
    } catch {
      // invalid selector, skip
    }
  }
  return null;
}

function firstImageSrc(doc: Document, selectors: string[]): string | null {
  for (const sel of selectors) {
    try {
      const el = doc.querySelector(sel) as HTMLImageElement | null;
      if (el) {
        const src = el.src || el.getAttribute('data-src') || el.getAttribute('srcset')?.split(' ')[0];
        if (src) return src;
      }
    } catch {
      // skip
    }
  }
  return null;
}

/** Also try JSON-LD structured data (many shops use it) */
function extractFromJsonLd(doc: Document): Partial<ExtractedProduct> {
  const result: Partial<ExtractedProduct> = {};
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent || '');
      const product = data['@type'] === 'Product' ? data : data['@graph']?.find?.((x: { '@type': string }) => x['@type'] === 'Product');
      if (product) {
        if (product.name) result.name = product.name;
        if (product.image) {
          const img = Array.isArray(product.image) ? product.image[0] : product.image;
          result.image_url = typeof img === 'string' ? img : img?.url || null;
        }
        if (product.sku) result.article_number = String(product.sku);
        const offer = product.offers || product.offer;
        if (offer) {
          const o = Array.isArray(offer) ? offer[0] : offer;
          if (o.price) result.price = parseFloat(o.price);
        }
      }
    } catch {
      // bad JSON
    }
  }
  return result;
}

/**
 * Extract product info from a URL using CORS proxy + DOM parsing.
 * Falls back to JSON-LD structured data, then CSS selector scraping.
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
    const html = await fetchViaProxy(url);
    const doc = new DOMParser().parseFromString(html, 'text/html');

    // 1) Try JSON-LD first (most reliable)
    const ld = extractFromJsonLd(doc);
    if (ld.name) result.name = ld.name;
    if (ld.price != null) result.price = ld.price;
    if (ld.image_url) result.image_url = ld.image_url;
    if (ld.article_number) result.article_number = ld.article_number;

    // 2) Fill gaps with shop-specific CSS selectors
    const shopKey = shop?.toLowerCase().replace(/\s/g, '') || '';
    const config = SHOP_CONFIGS[shopKey] || SHOP_CONFIGS.jula; // fallback to jula-like

    if (!result.name) {
      result.name = firstMatch(doc, config.nameSelectors);
    }
    if (result.price == null) {
      const priceText = firstMatch(doc, config.priceSelectors);
      if (priceText) result.price = parsePrice(priceText);
    }
    if (!result.image_url) {
      result.image_url = firstImageSrc(doc, config.imageSelectors);
    }
    if (!result.article_number) {
      result.article_number = firstMatch(doc, config.articleSelectors);
    }

    // 3) Try og:image / og:title as final fallback
    if (!result.name) {
      result.name = doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || null;
    }
    if (!result.image_url) {
      result.image_url = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || null;
    }

    // 4) Extract article number from URL for Jula (e.g. /meterstokk-014285/)
    if (!result.article_number && shop === 'Jula') {
      const m = url.match(/[-/](\d{6})\/?$/);
      if (m) result.article_number = m[1];
    }

    console.log('[extract] Result:', result);
  } catch (err) {
    console.warn('[extract] Proxy fetch failed, returning partial result:', err);
  }

  return result;
}

/**
 * Classify a tool as basic or advanced.
 * TODO: Replace with Cloud Function call to `classifyTool(name)`
 */
export async function classifyTool(name: string): Promise<'basic' | 'advanced'> {
  console.log('[AI STUB] classifyTool called with:', name);
  return 'advanced';
}

/**
 * Extract kit contents from a URL.
 * TODO: Replace with Cloud Function call to `extractKitContents(url)`
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
  if (lower.includes('obsbygg.no') || lower.includes('obs-bygg.no')) return 'Obs Bygg';
  return null;
}

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|webp|gif|svg)(\?|$)/i.test(url);
}
