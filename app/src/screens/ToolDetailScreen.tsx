import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../store';
import { getStatus, calculateGaps, locationLabel, locationClass } from '../logic';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import type { InventoryItem, ProductCandidate } from '../types';

export function ToolDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    state, updateTool, removeInventoryItem, updateInventoryItem,
    chooseCandidate, removeCandidate, updateCandidate,
  } = useApp();

  const tool = state.tools.find((t) => t.id === id);
  if (!tool) return <div className="section">Verktøy ikke funnet</div>;

  const status = getStatus(tool);
  const gaps = tool.inventoryDone ? calculateGaps(tool) : null;

  const sortedCandidates = [...tool.candidates].sort((a, b) => a.price - b.price);
  const lowestPrice = sortedCandidates.length > 0 ? sortedCandidates[0].price : null;
  const [showCandidates, setShowCandidates] = useState(tool.candidates.length > 0);
  const [showNotes, setShowNotes] = useState(false);

  const getShopClass = (shop: string) => {
    const lower = shop.toLowerCase();
    if (lower.includes('jula')) return 'shop-jula';
    if (lower.includes('biltema')) return 'shop-biltema';
    if (lower.includes('clas')) return 'shop-clas';
    if (lower.includes('byggmax')) return 'shop-byggmax';
    if (lower.includes('obs')) return 'shop-obs';
    return '';
  };

  return (
    <div className="slide-in detail-wizard">
      <div className="detail-header">
        <button className="back-btn" onClick={() => navigate('/')}>&#8592;</button>
        <div>
          <div className="detail-title">{tool.name}</div>
          <div className="detail-category">{tool.category}</div>
        </div>
        <div className="detail-badge">
          <StatusBadge status={status} />
        </div>
      </div>

      <div className="section wizard-step">
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

      <div className="section wizard-step">
        <div className="section-title">Beholdning ({tool.inventory.length})</div>

        {tool.inventory.map((item) => (
          <InventoryItemRow
            key={item.id}
            item={item}
            toolName={tool.name}
            onRemove={() => removeInventoryItem(tool.id, item.id)}
            onUpdate={(updates) => updateInventoryItem(tool.id, item.id, updates)}
          />
        ))}

        <div className="btn-row wizard-actions">
          <button
            className="btn btn-secondary btn-full wizard-outline-btn"
            onClick={() => navigate(`/capture/${tool.id}/existing`)}
          >
            + Legg til eksisterende
          </button>
        </div>

        {!tool.inventoryDone && (
          <div className="btn-row" style={{ marginTop: 8 }}>
            {tool.inventory.length > 0 ? (
              <button
                className="btn btn-primary btn-full"
                onClick={() => updateTool(tool.id, { inventoryDone: true })}
              >
                Ferdig med beholdning
              </button>
            ) : (
              <button
                className="btn btn-full wizard-empty-btn"
                onClick={() => updateTool(tool.id, { inventoryDone: true })}
              >
                Har ingen av denne
              </button>
            )}
          </div>
        )}
      </div>

      {tool.inventoryDone && gaps && (
        <div className="section wizard-step">
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
                  Må flyttes fra Østerliveien til Raschs Vei
                </div>
              )}
              {!gaps.mine && !gaps.needsMove && gaps.needsBuy.length > 0 && (
                <div className="gap-summary">Må kjøpes</div>
              )}
            </>
          )}

          {(gaps.needsBuy.length > 0 || tool.candidates.length > 0) && (
            <div className="btn-row" style={{ marginTop: 12 }}>
              <button className="btn btn-secondary btn-full" onClick={() => setShowCandidates((v) => !v)}>
                {showCandidates ? 'Skjul kjøpskandidater' : 'Gå videre til kjøpskandidater'}
              </button>
            </div>
          )}
        </div>
      )}

      {tool.inventoryDone && showCandidates && (gaps?.needsBuy.length || tool.candidates.length > 0) ? (
        <div className="section wizard-step">
          <div className="section-title">Kjøpskandidater</div>

          {sortedCandidates.map((candidate) => {
            const originalIdx = tool.candidates.findIndex((c) => c.id === candidate.id);
            const isChosen = tool.chosen === originalIdx;
            const isLowest = candidate.price === lowestPrice;
            const priceDiff = lowestPrice !== null && candidate.price > lowestPrice
              ? candidate.price - lowestPrice
              : null;

            return (
              <CandidateRow
                key={candidate.id}
                candidate={candidate}
                isChosen={isChosen}
                isLowest={isLowest}
                priceDiff={priceDiff}
                getShopClass={getShopClass}
                onToggleChosen={() => chooseCandidate(tool.id, isChosen ? null : originalIdx)}
                onRemove={() => removeCandidate(tool.id, candidate.id)}
                onUpdate={(updates) => updateCandidate(tool.id, candidate.id, updates)}
                shops={state.preferredShops}
              />
            );
          })}

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

      <div className="section wizard-step">
        <button className="btn btn-ghost btn-full" onClick={() => setShowNotes((v) => !v)}>
          {showNotes ? 'Skjul notater' : 'Vis notater (valgfritt)'}
        </button>
        {showNotes && (
          <textarea
            className="notes-textarea"
            value={tool.notes}
            onChange={(e) => updateTool(tool.id, { notes: e.target.value })}
            placeholder="Valgfrie notater..."
            style={{ marginTop: 10 }}
          />
        )}
      </div>
    </div>
  );
}

/* ── Inventory item row with edit and move ── */

function InventoryItemRow({ item, toolName, onRemove, onUpdate }: {
  item: InventoryItem;
  toolName: string;
  onRemove: () => void;
  onUpdate: (updates: Partial<InventoryItem>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editImage, setEditImage] = useState(item.image);
  const [editLocation, setEditLocation] = useState(item.location);

  const handleSaveEdit = () => {
    onUpdate({ name: editName, image: editImage, location: editLocation });
    setEditing(false);
  };

  const toggleLocation = () => {
    const newLoc = item.location === 'mine' ? 'parents' as const : 'mine' as const;
    onUpdate({ location: newLoc });
  };

  return (
    <>
      <div className="inventory-item">
        {item.image ? (
          <img className="inventory-item-image" src={item.image} alt="" />
        ) : (
          <div className="inventory-item-image-placeholder">&#128295;</div>
        )}
        <div className="inventory-item-info">
          <div className="inventory-item-name">{item.name || toolName}</div>
          <div className="inventory-item-meta">
            {item.shop && `${item.shop} `}
            {item.price !== null && `${item.price} kr`}
          </div>
          <span className={`location-badge ${locationClass(item.location)}`}>
            {locationLabel(item.location)}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button className="btn-icon" title="Flytt" onClick={toggleLocation}>&#8644;</button>
          <button className="btn-icon" title="Rediger" onClick={() => setEditing(true)}>&#9998;</button>
          <button className="btn-icon delete" title="Slett" onClick={onRemove}>&times;</button>
        </div>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Rediger beholdning">
        <div className="form-group">
          <label className="form-label">Bilde-URL *</label>
          <input className="form-input" value={editImage} onChange={(e) => setEditImage(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Navn *</label>
          <input className="form-input" value={editName} onChange={(e) => setEditName(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Plassering *</label>
          <div className="location-options">
            {(['mine', 'parents'] as const).map((loc) => (
              <button
                key={loc}
                className={`location-option ${editLocation === loc ? 'selected' : ''}`}
                onClick={() => setEditLocation(loc)}
              >
                {locationLabel(loc)}
              </button>
            ))}
          </div>
        </div>
        <button className="btn btn-primary btn-full" onClick={handleSaveEdit}>Lagre</button>
      </Modal>
    </>
  );
}

/* ── Candidate row with edit ── */

function CandidateRow({ candidate, isChosen, isLowest, priceDiff, getShopClass, onToggleChosen, onRemove, onUpdate, shops }: {
  candidate: ProductCandidate;
  isChosen: boolean;
  isLowest: boolean;
  priceDiff: number | null;
  getShopClass: (shop: string) => string;
  onToggleChosen: () => void;
  onRemove: () => void;
  onUpdate: (updates: Partial<ProductCandidate>) => void;
  shops: string[];
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(candidate.name);
  const [editImage, setEditImage] = useState(candidate.image);
  const [editProductUrl, setEditProductUrl] = useState(candidate.productUrl);
  const [editShop, setEditShop] = useState(candidate.shop);
  const [editPrice, setEditPrice] = useState(String(candidate.price));

  const handleSaveEdit = () => {
    onUpdate({
      name: editName,
      image: editImage,
      productUrl: editProductUrl,
      shop: editShop,
      price: parseFloat(editPrice) || 0,
    });
    setEditing(false);
  };

  return (
    <>
      <div className={`candidate-card ${isChosen ? 'selected' : ''}`}>
        <div style={{ flex: '0 0 auto', cursor: 'pointer' }} onClick={onToggleChosen}>
          {candidate.image ? (
            <img className="candidate-card-image" src={candidate.image} alt="" />
          ) : (
            <div className="inventory-item-image-placeholder">&#128722;</div>
          )}
        </div>
        <div className="candidate-card-info" onClick={onToggleChosen}>
          <div className="candidate-name">{candidate.name}</div>
          <div className="candidate-meta">
            {candidate.shop && (
              <span className={`shop-badge ${getShopClass(candidate.shop)}`}>
                {candidate.shop}
              </span>
            )}
            {isLowest && <span className="lowest-badge">Lavest pris</span>}
          </div>
        </div>
        <div style={{ textAlign: 'right' }} onClick={onToggleChosen}>
          <div className="candidate-price">{candidate.price} kr</div>
          {priceDiff !== null && (
            <div className="candidate-price-diff">+{priceDiff} kr</div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 4 }}>
          <div className={`candidate-radio ${isChosen ? 'checked' : ''}`} onClick={onToggleChosen}>
            {isChosen && '\u2713'}
          </div>
          <button className="btn-icon" title="Rediger" onClick={() => setEditing(true)}>&#9998;</button>
          <button className="btn-icon delete" title="Slett" onClick={onRemove}>&times;</button>
        </div>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Rediger kandidat">
        <div className="form-group">
          <label className="form-label">Bilde-URL *</label>
          <input className="form-input" value={editImage} onChange={(e) => setEditImage(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Produktlenke *</label>
          <input className="form-input" value={editProductUrl} onChange={(e) => setEditProductUrl(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Navn *</label>
          <input className="form-input" value={editName} onChange={(e) => setEditName(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Butikk *</label>
          <select className="form-input" value={editShop} onChange={(e) => setEditShop(e.target.value)}>
            <option value="">Velg butikk...</option>
            {shops.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Pris (kr) *</label>
          <input className="form-input" type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
        </div>
        <button className="btn btn-primary btn-full" onClick={handleSaveEdit}>Lagre</button>
      </Modal>
    </>
  );
}
