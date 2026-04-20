import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../store';
import { detectShop } from '../logic';
import { extractProductFromUrl } from '../ai';

export function CaptureScreen() {
  const { toolId, mode } = useParams<{ toolId: string; mode: string }>();
  const navigate = useNavigate();
  const { state, addInventoryItem, addCandidate, addKit } = useApp();

  const tool = state.tools.find((t) => t.id === toolId);

  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [captured, setCaptured] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [image, setImage] = useState('');
  const [shop, setShop] = useState('');
  const [articleNumber, setArticleNumber] = useState('');
  const [location, setLocation] = useState<'mine' | 'parents' | 'unknown'>('mine');

  // Kit fields
  const [kitContents, setKitContents] = useState('');

  const isImageUrl = (u: string) => /\.(jpg|jpeg|png|webp|gif|svg)(\?|$)/i.test(u);

  const handleCapture = async () => {
    if (!url.trim()) return;
    setLoading(true);

    // Check if it's an image URL
    if (isImageUrl(url)) {
      setImage(url);
      setCaptured(true);
      setLoading(false);
      return;
    }

    // Detect shop from URL
    const detectedShop = detectShop(url);
    if (detectedShop) setShop(detectedShop);

    // Try AI extraction
    try {
      const result = await extractProductFromUrl(url);
      if (result.name) setName(result.name);
      if (result.price !== null) setPrice(String(result.price));
      if (result.image_url) setImage(result.image_url);
      if (result.shop) setShop(result.shop);
      if (result.article_number) setArticleNumber(result.article_number);
    } catch (err) {
      console.error('Extraction failed:', err);
    }

    setCaptured(true);
    setLoading(false);
  };

  const handleSave = () => {
    const priceNum = price ? parseFloat(price) : null;

    if (mode === 'existing') {
      addInventoryItem(toolId!, {
        location,
        name: name || tool?.name || '',
        image: image || null,
        url: url || null,
        shop: shop || null,
        price: priceNum,
      });
    } else if (mode === 'candidate') {
      addCandidate(toolId!, {
        name: name || tool?.name || '',
        image: image || null,
        url: url || null,
        shop: shop || 'Ukjent',
        price: priceNum,
        articleNumber: articleNumber || null,
      });
    } else if (mode === 'kit') {
      addKit({
        name: name || 'Verktøysett',
        url: url || '',
        image: image || null,
        shop: shop || 'Ukjent',
        price: priceNum || 0,
        contents: kitContents.split('\n').map((s) => s.trim()).filter(Boolean),
      });
    }

    navigate(mode === 'kit' ? '/kits' : `/tool/${toolId}`);
  };

  const modeLabel = mode === 'existing' ? 'finn eksisterende' : mode === 'candidate' ? 'finn kandidat' : 'legg til sett';

  return (
    <div className="slide-in">
      <div className="detail-header">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <div>
          <div className="detail-title">{tool?.name || 'Sett'}</div>
          <div className="detail-category">{modeLabel}</div>
        </div>
      </div>

      {!captured ? (
        <>
          {/* URL paste area */}
          <div className="url-paste-area">
            <div className="form-label">Lim inn URL til produktside eller bilde</div>
            <div className="url-input-row">
              <input
                className="form-input"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://jula.no/..."
              />
              <button className="btn btn-primary" onClick={handleCapture} disabled={loading}>
                {loading ? '...' : 'Fang'}
              </button>
            </div>

            <div className="quick-launch">
              <button className="quick-chip" onClick={() => window.open('https://jula.no', '_blank')}>Jula.no</button>
              <button className="quick-chip" onClick={() => window.open('https://biltema.no', '_blank')}>Biltema.no</button>
              <button className="quick-chip" onClick={() => window.open('https://clasohlson.no', '_blank')}>Clas Ohlson</button>
              <button className="quick-chip" onClick={() => window.open('https://byggmax.no', '_blank')}>Byggmax.no</button>
            </div>

            <div style={{ marginTop: 16 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setCaptured(true)}>
                Hopp over URL — legg inn manuelt
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Captured data / manual entry */}
          <div className="section">
            {image && <img className="image-preview" src={image} alt="Produkt" />}

            <div className="form-group">
              <label className="form-label">Bilde-URL</label>
              <input className="form-input" value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://..." />
            </div>

            <div className="form-group">
              <label className="form-label">Navn</label>
              <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={tool?.name || 'Produktnavn'} />
            </div>

            <div className="form-group">
              <label className="form-label">Butikk</label>
              <input className="form-input" value={shop} onChange={(e) => setShop(e.target.value)} placeholder="F.eks. Jula" />
            </div>

            <div className="form-group">
              <label className="form-label">Pris (kr)</label>
              <input className="form-input" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
            </div>

            {mode !== 'kit' && (
              <div className="form-group">
                <label className="form-label">Artikkelnummer</label>
                <input className="form-input" value={articleNumber} onChange={(e) => setArticleNumber(e.target.value)} placeholder="Valgfritt" />
              </div>
            )}

            {mode === 'existing' && (
              <div className="form-group">
                <label className="form-label">Plassering</label>
                <div className="location-options">
                  {(['mine', 'parents', 'unknown'] as const).map((loc) => (
                    <button
                      key={loc}
                      className={`location-option ${location === loc ? 'selected' : ''}`}
                      onClick={() => setLocation(loc)}
                    >
                      {loc === 'mine' ? 'Raschs Vei' : loc === 'parents' ? 'Østerliveien' : 'Vet ikke'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mode === 'kit' && (
              <div className="form-group">
                <label className="form-label">Innhold (ett verktøy per linje)</label>
                <textarea
                  className="notes-textarea"
                  value={kitContents}
                  onChange={(e) => setKitContents(e.target.value)}
                  placeholder="Hammer&#10;Skiftenøkkel&#10;Skrutrekker..."
                />
              </div>
            )}

            <button className="btn btn-primary btn-full" onClick={handleSave}>
              {mode === 'existing' ? 'Legg til i beholdning' : mode === 'candidate' ? 'Legg til som kandidat' : 'Lagre sett'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
