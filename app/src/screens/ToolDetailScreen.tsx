import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../store';
import { getStatus, calculateGaps } from '../logic';
import { StatusBadge } from '../components/StatusBadge';

export function ToolDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state, updateTool, removeInventoryItem, chooseCandidate, removeCandidate } = useApp();

  const tool = state.tools.find((t) => t.id === id);
  if (!tool) return <div className="section">Verktøy ikke funnet</div>;

  const status = getStatus(tool);
  const gaps = tool.inventoryDone ? calculateGaps(tool) : null;

  const sortedCandidates = [...tool.candidates].sort((a, b) => {
    if (a.price === null && b.price === null) return 0;
    if (a.price === null) return 1;
    if (b.price === null) return -1;
    return a.price - b.price;
  });
  const lowestPrice = sortedCandidates.find((c) => c.price !== null)?.price ?? null;

  const getShopClass = (shop: string) => {
    const lower = shop.toLowerCase();
    if (lower.includes('jula')) return 'shop-jula';
    if (lower.includes('biltema')) return 'shop-biltema';
    if (lower.includes('clas')) return 'shop-clas';
    if (lower.includes('byggmax')) return 'shop-byggmax';
    return '';
  };

  const locationLabel = (loc: string) => {
    switch (loc) {
      case 'mine': return 'Raschs Vei';
      case 'parents': return 'Østerliveien';
      default: return 'Ukjent';
    }
  };

  const locationClass = (loc: string) => {
    switch (loc) {
      case 'mine': return 'location-mine';
      case 'parents': return 'location-parents';
      default: return 'location-unknown';
    }
  };

  return (
    <div className="slide-in">
      {/* Header */}
      <div className="detail-header">
        <button className="back-btn" onClick={() => navigate('/')}>←</button>
        <div>
          <div className="detail-title">{tool.name}</div>
          <div className="detail-category">{tool.category}</div>
        </div>
        <div className="detail-badge">
          <StatusBadge status={status} />
        </div>
      </div>

      {/* Type Toggle */}
      <div className="section">
        <div className="type-toggle">
          <button
            className={tool.type === 'basic' ? 'active' : ''}
            onClick={() => updateTool(tool.id, { type: 'basic' })}
          >
            Grunnleggende (2 stk)
          </button>
          <button
            className={tool.type === 'advanced' ? 'active' : ''}
            onClick={() => updateTool(tool.id, { type: 'advanced' })}
          >
            Avansert (1 stk)
          </button>
        </div>
      </div>

      {/* Inventory */}
      <div className="section">
        <div className="section-title">Beholdning ({tool.inventory.length})</div>

        {tool.inventory.map((item) => (
          <div key={item.id} className="inventory-item">
            {item.image ? (
              <img className="inventory-item-image" src={item.image} alt="" />
            ) : (
              <div className="inventory-item-image-placeholder">🔧</div>
            )}
            <div className="inventory-item-info">
              <div className="inventory-item-name">{item.name || tool.name}</div>
              <div className="inventory-item-meta">
                {item.shop && `${item.shop} `}
                {item.price !== null && `${item.price} kr`}
              </div>
              <span className={`location-badge ${locationClass(item.location)}`}>
                {locationLabel(item.location)}
              </span>
            </div>
            <button className="delete-btn" onClick={() => removeInventoryItem(tool.id, item.id)}>×</button>
          </div>
        ))}

        <div className="btn-row">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate(`/capture/${tool.id}/existing`)}
          >
            + Legg til eksisterende
          </button>
        </div>

        {!tool.inventoryDone && (
          <div className="btn-row" style={{ marginTop: 8 }}>
            {tool.inventory.length > 0 ? (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => updateTool(tool.id, { inventoryDone: true })}
              >
                Ferdig med beholdning
              </button>
            ) : (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => updateTool(tool.id, { inventoryDone: true })}
              >
                Har ingen av denne
              </button>
            )}
          </div>
        )}
      </div>

      {/* Gap Analysis */}
      {tool.inventoryDone && gaps && (
        <div className="section">
          <div className="section-title">Behovsanalyse</div>

          {tool.type === 'basic' ? (
            <>
              <div className="gap-row">
                <span className="gap-label">Raschs Vei</span>
                <span className="gap-status">
                  <span className={`gap-dot ${gaps.mine ? 'gap-dot-green' : 'gap-dot-red'}`} />
                  {gaps.mine ? 'Dekket' : 'Mangler'}
                </span>
              </div>
              <div className="gap-row">
                <span className="gap-label">Østerliveien</span>
                <span className="gap-status">
                  <span className={`gap-dot ${gaps.parents ? 'gap-dot-green' : 'gap-dot-red'}`} />
                  {gaps.parents ? 'Dekket' : 'Mangler'}
                </span>
              </div>
              {gaps.needsBuy.length > 0 && (
                <div className="gap-summary">
                  Trenger {gaps.needsBuy.length} stk til
                </div>
              )}
            </>
          ) : (
            <>
              <div className="gap-row">
                <span className="gap-label">Raschs Vei (primær)</span>
                <span className="gap-status">
                  <span className={`gap-dot ${gaps.mine ? 'gap-dot-green' : 'gap-dot-red'}`} />
                  {gaps.mine ? 'Dekket' : 'Mangler'}
                </span>
              </div>
              {gaps.needsMove && (
                <div className="gap-summary move">
                  Må flyttes fra foreldrehjemmet til deg
                </div>
              )}
              {!gaps.mine && !gaps.needsMove && gaps.needsBuy.length > 0 && (
                <div className="gap-summary">Må kjøpes</div>
              )}
            </>
          )}
        </div>
      )}

      {/* Purchase Candidates */}
      {tool.inventoryDone && (gaps?.needsBuy.length || tool.candidates.length > 0) ? (
        <div className="section">
          <div className="section-title">Kjøpskandidater</div>

          {sortedCandidates.map((candidate) => {
            const originalIdx = tool.candidates.findIndex((c) => c.id === candidate.id);
            const isChosen = tool.chosen === originalIdx;
            const isLowest = candidate.price !== null && candidate.price === lowestPrice;
            const priceDiff = candidate.price !== null && lowestPrice !== null && candidate.price > lowestPrice
              ? candidate.price - lowestPrice
              : null;

            return (
              <div
                key={candidate.id}
                className={`candidate-card ${isChosen ? 'selected' : ''}`}
                onClick={() => chooseCandidate(tool.id, isChosen ? null : originalIdx)}
              >
                {candidate.image ? (
                  <img className="candidate-card-image" src={candidate.image} alt="" />
                ) : (
                  <div className="inventory-item-image-placeholder">🛒</div>
                )}
                <div className="candidate-card-info">
                  <div className="candidate-name">{candidate.name || tool.name}</div>
                  <div className="candidate-meta">
                    {candidate.shop && (
                      <span className={`shop-badge ${getShopClass(candidate.shop)}`}>
                        {candidate.shop}
                      </span>
                    )}
                    {isLowest && <span className="lowest-badge">Lavest pris</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {candidate.price !== null && (
                    <div className="candidate-price">{candidate.price} kr</div>
                  )}
                  {priceDiff !== null && (
                    <div className="candidate-price-diff">+{priceDiff} kr</div>
                  )}
                </div>
                <div className={`candidate-radio ${isChosen ? 'checked' : ''}`}>
                  {isChosen && '✓'}
                </div>
              </div>
            );
          })}

          {sortedCandidates.length > 0 && (
            <button
              className="delete-btn"
              style={{ display: 'block', margin: '4px auto', fontSize: 12, color: '#991b1b' }}
              onClick={() => {
                const last = tool.candidates[tool.candidates.length - 1];
                if (last) removeCandidate(tool.id, last.id);
              }}
            >
              Slett siste kandidat
            </button>
          )}

          <div className="btn-row">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate(`/capture/${tool.id}/candidate`)}
            >
              + Legg til kandidat
            </button>
          </div>
        </div>
      ) : null}

      {/* Notes */}
      <div className="section">
        <div className="section-title">Notater</div>
        <textarea
          className="notes-textarea"
          value={tool.notes}
          onChange={(e) => updateTool(tool.id, { notes: e.target.value })}
          placeholder="Valgfrie notater..."
        />
      </div>
    </div>
  );
}
