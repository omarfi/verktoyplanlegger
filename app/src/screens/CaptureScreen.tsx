import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../store';
import { detectShop } from '../logic';
import { extractProductFromUrl } from '../ai';
import { searchImages } from '../imageSearch';

export function CaptureScreen() {
  const { toolId, mode } = useParams<{ toolId: string; mode: string }>();
  const navigate = useNavigate();
  const { state, addInventoryItem, addCandidate, addKit, addCustomTool, addShop } = useApp();

  const tool = state.tools.find((t) => t.id === toolId);

  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [captured, setCaptured] = useState(mode === 'existing');
  const [searchingImages, setSearchingImages] = useState(false);
  const [imageSearchQuery, setImageSearchQuery] = useState(tool?.name || '');
  const [imageResults, setImageResults] = useState<Array<{ url: string; thumb: string; title: string }>>([]);
  const [imageSearchError, setImageSearchError] = useState<string | null>(null);

  const [name, setName] = useState(tool?.name || '');
  const [price, setPrice] = useState('');
  const [image, setImage] = useState('');
  const [shop, setShop] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [articleNumber, setArticleNumber] = useState('');
  const [location, setLocation] = useState<'mine' | 'parents'>('mine');

  const [kitToolIds, setKitToolIds] = useState<string[]>([]);
  const [toolSearch, setToolSearch] = useState('');

  const [showCustomShop, setShowCustomShop] = useState(false);
  const [customShop, setCustomShop] = useState('');

  const isImageUrl = (u: string) => /\.(jpg|jpeg|png|webp|gif|svg)(\?|$)/i.test(u);

  useEffect(() => {
    if (tool?.name) {
      setName((prev) => prev || tool.name);
      setImageSearchQuery((prev) => prev || tool.name);
    }
  }, [tool?.name]);

  const handleImageSearch = async (forcedQuery?: string) => {
    const query = (forcedQuery ?? imageSearchQuery ?? name ?? tool?.name ?? '').trim();
    if (!query) return;

    setSearchingImages(true);
    setImageSearchError(null);
    try {
      const results = await searchImages(query, 24);
      setImageResults(results);
      if (results.length === 0) {
        setImageSearchError('Ingen bilder funnet. Prøv et annet søk.');
      }
    } catch {
      setImageSearchError('Google-bildesøk feilet. Sjekk credentials/API-kvote.');
      setImageResults([]);
    } finally {
      setSearchingImages(false);
    }
  };

  useEffect(() => {
    if (mode !== 'existing' || !captured) return;
    const q = (tool?.name || name || '').trim();
    if (!q) return;
    handleImageSearch(q);
    // intentionally run on entry
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, captured, tool?.name]);

  const handleCapture = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setProductUrl(url.trim());

    if (isImageUrl(url)) {
      setImage(url);
      setCaptured(true);
      setLoading(false);
      return;
    }

    const detectedShop = detectShop(url);
    if (detectedShop) setShop(detectedShop);

    try {
      const result = await extractProductFromUrl(url);
      if (result.name) setName(result.name);
      if (result.price !== null) setPrice(String(result.price));
      if (result.image_url) setImage(result.image_url);
      if (result.shop) setShop(result.shop);
      if (result.article_number) setArticleNumber(result.article_number);
    } catch {
      // silent fallback to manual fields
    }

    setCaptured(true);
    setLoading(false);
  };

  const isValid = () => {
    if (mode === 'existing') return image.trim() && name.trim() && location;
    if (mode === 'candidate') return image.trim() && productUrl.trim() && name.trim() && shop.trim() && price.trim();
    if (mode === 'kit') return image.trim() && productUrl.trim() && name.trim() && shop.trim() && price.trim() && kitToolIds.length > 0;
    return false;
  };

  const handleSave = () => {
    if (!isValid()) return;
    const priceNum = price ? parseFloat(price) : null;

    if (mode === 'existing') {
      addInventoryItem(toolId!, {
        location,
        name: name || tool?.name || '',
        image,
        url: productUrl || url || null,
        shop: shop || null,
        price: priceNum,
      });
    } else if (mode === 'candidate') {
      addCandidate(toolId!, {
        name,
        image,
        productUrl,
        shop,
        price: priceNum || 0,
        articleNumber: articleNumber || null,
      });
    } else if (mode === 'kit') {
      addKit({
        name,
        productUrl,
        image,
        shop,
        price: priceNum || 0,
        contents: kitToolIds,
      });
    }

    navigate(mode === 'kit' ? '/kits' : `/tool/${toolId}`);
  };

  const handleAddCustomShop = () => {
    if (!customShop.trim()) return;
    addShop({ name: customShop.trim(), url: 'https://' });
    setShop(customShop.trim());
    setCustomShop('');
    setShowCustomShop(false);
  };

  const filteredTools = toolSearch.trim()
    ? state.tools.filter((t) =>
        t.name.toLowerCase().includes(toolSearch.toLowerCase()) &&
        !kitToolIds.includes(t.id)
      )
    : [];

  const modeLabel = mode === 'existing' ? 'finn eksisterende' : mode === 'candidate' ? 'finn kandidat' : 'legg til sett';
  const shops = state.preferredShops;

  return (
    <div className="slide-in">
      <div className="detail-header">
        <button className="back-btn" onClick={() => navigate(-1)}>&#8592;</button>
        <div>
          <div className="detail-title">{tool?.name || 'Sett'}</div>
          <div className="detail-category">{modeLabel}</div>
        </div>
      </div>

      {!captured ? (
        <div className="url-paste-area">
          <div className="form-label">Lim inn URL til produktside eller bilde</div>
          <div className="url-input-row">
            <input className="form-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://jula.no/..." />
            <button className="btn btn-primary" onClick={handleCapture} disabled={loading}>{loading ? '...' : 'Fang'}</button>
          </div>

          <div className="quick-launch">
            {shops.map((s) => (
              <button key={s.id} className="quick-chip" onClick={() => window.open(s.url, '_blank')}>
                {s.name}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 16 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setCaptured(true)}>
              Hopp over URL — legg inn manuelt
            </button>
          </div>
        </div>
      ) : (
        <div className="section">
          {mode === 'existing' && (
            <div className="form-group">
              <label className="form-label">Bildesøk</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="form-input"
                  value={imageSearchQuery}
                  onChange={(e) => setImageSearchQuery(e.target.value)}
                  placeholder="Søk etter bilde..."
                  style={{ flex: 1 }}
                />
                <button className="btn btn-secondary btn-sm" onClick={() => handleImageSearch()} disabled={searchingImages}>
                  {searchingImages ? 'Søker...' : 'Søk'}
                </button>
              </div>

              {imageSearchError && <div style={{ marginTop: 8, fontSize: 12, color: '#9b1c1c' }}>{imageSearchError}</div>}

              {imageResults.length > 0 && (
                <div className="image-search-grid">
                  {imageResults.map((result) => (
                    <button
                      key={result.url}
                      className={`image-search-card ${image === result.url ? 'selected' : ''}`}
                      onClick={() => setImage(result.url)}
                      title={result.title}
                    >
                      <img src={result.thumb} alt={result.title} loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {image && <img className="image-preview" src={image} alt="Produkt" />}

          <div className="form-group">
            <label className="form-label">Bilde-URL *</label>
            <input className="form-input" value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://..." />
          </div>

          {mode !== 'existing' && (
            <div className="form-group">
              <label className="form-label">Produktlenke *</label>
              <input className="form-input" value={productUrl} onChange={(e) => setProductUrl(e.target.value)} placeholder="https://..." />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Navn *</label>
            <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={tool?.name || 'Produktnavn'} />
          </div>

          {mode !== 'existing' && (
            <div className="form-group">
              <label className="form-label">Butikk *</label>
              {!showCustomShop ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <select className="form-input" value={shop} onChange={(e) => setShop(e.target.value)} style={{ flex: 1 }}>
                    <option value="">Velg butikk...</option>
                    {shops.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowCustomShop(true)}>+</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="form-input" value={customShop} onChange={(e) => setCustomShop(e.target.value)} placeholder="Ny butikk..." style={{ flex: 1 }} />
                  <button className="btn btn-primary btn-sm" onClick={handleAddCustomShop}>Legg til</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowCustomShop(false)}>Avbryt</button>
                </div>
              )}
            </div>
          )}

          {mode !== 'existing' && (
            <div className="form-group">
              <label className="form-label">Pris (kr) *</label>
              <input className="form-input" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
            </div>
          )}

          {mode === 'candidate' && (
            <div className="form-group">
              <label className="form-label">Artikkelnummer</label>
              <input className="form-input" value={articleNumber} onChange={(e) => setArticleNumber(e.target.value)} placeholder="Valgfritt" />
            </div>
          )}

          {mode === 'existing' && (
            <div className="form-group">
              <label className="form-label">Plassering *</label>
              <div className="location-options">
                {(['mine', 'parents'] as const).map((loc) => (
                  <button key={loc} className={`location-option ${location === loc ? 'selected' : ''}`} onClick={() => setLocation(loc)}>
                    {loc === 'mine' ? 'Raschs Vei' : 'Østerliveien'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === 'kit' && (
            <div className="form-group">
              <label className="form-label">Innhold (velg verktøy) *</label>
              {kitToolIds.length > 0 && (
                <div className="kit-contents-list" style={{ marginBottom: 8 }}>
                  {kitToolIds.map((tid) => {
                    const t = state.tools.find((tt) => tt.id === tid);
                    return (
                      <span key={tid} className="kit-content-tag" style={{ cursor: 'pointer' }} onClick={() => setKitToolIds(kitToolIds.filter((x) => x !== tid))}>
                        {t?.name || tid} &times;
                      </span>
                    );
                  })}
                </div>
              )}
              <input className="form-input" value={toolSearch} onChange={(e) => setToolSearch(e.target.value)} placeholder="Søk etter verktøy..." />
              {filteredTools.length > 0 && (
                <div className="dropdown-list">
                  {filteredTools.slice(0, 10).map((t) => (
                    <div key={t.id} className="dropdown-item" onClick={() => { setKitToolIds([...kitToolIds, t.id]); setToolSearch(''); }}>
                      {t.name} <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({t.category})</span>
                    </div>
                  ))}
                </div>
              )}
              {toolSearch.trim() && filteredTools.length === 0 && (
                <div style={{ padding: '8px 0', fontSize: 13, color: 'var(--text-muted)' }}>
                  Ingen treff.{' '}
                  <button className="btn btn-ghost btn-sm" onClick={() => { addCustomTool(toolSearch.trim(), 'Annet', 'basic'); setToolSearch(''); }}>
                    + Legg til verktøy &ldquo;{toolSearch.trim()}&rdquo;
                  </button>
                </div>
              )}
            </div>
          )}

          <button className="btn btn-primary btn-full" onClick={handleSave} disabled={!isValid()}>
            {mode === 'existing' ? 'Legg til i beholdning' : mode === 'candidate' ? 'Legg til som kandidat' : 'Lagre sett'}
          </button>
        </div>
      )}
    </div>
  );
}
