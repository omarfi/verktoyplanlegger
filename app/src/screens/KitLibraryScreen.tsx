import { useNavigate } from 'react-router-dom';
import { useApp } from '../store';

export function KitLibraryScreen() {
  const { state, removeKit } = useApp();
  const navigate = useNavigate();

  const toolName = (id: string) => state.tools.find((t) => t.id === id)?.name || id;

  return (
    <div>
      <div className="detail-header">
        <button className="back-btn" onClick={() => navigate(-1)}>&#8592;</button>
        <div className="detail-title">Settbibliotek</div>
      </div>

      {state.kits.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">&#128230;</div>
          <div className="empty-state-text">Ingen sett registrert ennå</div>
        </div>
      ) : (
        state.kits.map((kit) => (
          <div key={kit.id} className="kit-card">
            <div className="kit-card-header">
              {kit.image ? (
                <img className="kit-card-image" src={kit.image} alt="" />
              ) : (
                <div className="inventory-item-image-placeholder" style={{ width: 64, height: 64 }}>&#128230;</div>
              )}
              <div className="kit-card-info">
                <div className="kit-card-name">{kit.name}</div>
                <div className="kit-card-meta">{kit.shop} &middot; {kit.price} kr</div>
                {kit.productUrl && (
                  <a href={kit.productUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--primary)' }}>
                    Se produkt &#8599;
                  </a>
                )}
              </div>
              <button className="delete-btn" onClick={() => removeKit(kit.id)}>&times;</button>
            </div>
            {kit.contents.length > 0 && (
              <div className="kit-contents-list">
                {kit.contents.map((c, i) => (
                  <span key={i} className="kit-content-tag">{toolName(c)}</span>
                ))}
              </div>
            )}
          </div>
        ))
      )}

      <div className="section">
        <button
          className="btn btn-primary btn-full"
          onClick={() => navigate('/capture/kit/kit')}
        >
          + Legg til sett
        </button>
      </div>
    </div>
  );
}
