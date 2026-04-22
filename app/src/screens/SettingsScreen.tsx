import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, useAuth } from '../store';
import { ConfirmDialog } from '../components/Modal';

export function SettingsScreen() {
  const { state, resetAll, addShop, updateShop, removeShop } = useApp();
  const { logOut } = useAuth();
  const navigate = useNavigate();
  const [showReset, setShowReset] = useState(false);
  const [newShop, setNewShop] = useState('');
  const [newShopUrl, setNewShopUrl] = useState('https://');
  const [editingShopId, setEditingShopId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'verktoyplanlegger-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportShopping = () => {
    let text = 'HANDLELISTE\n\n';
    const items: { name: string; shop: string; price: number }[] = [];
    for (const t of state.tools) {
      if (t.chosen !== null && t.candidates[t.chosen]) {
        const c = t.candidates[t.chosen];
        items.push({ name: t.name, shop: c.shop, price: c.price });
      }
    }

    const byShop = new Map<string, typeof items>();
    for (const item of items) {
      if (!byShop.has(item.shop)) byShop.set(item.shop, []);
      byShop.get(item.shop)!.push(item);
    }

    for (const [shop, shopItems] of byShop) {
      text += `${shop}:\n`;
      for (const item of shopItems) {
        text += `  - ${item.name}: ${item.price} kr\n`;
      }
      const total = shopItems.reduce((s, i) => s + i.price, 0);
      text += `  Subtotal: ${total} kr\n\n`;
    }

    const grandTotal = items.reduce((s, i) => s + i.price, 0);
    text += `TOTALT: ${grandTotal} kr`;

    navigator.clipboard.writeText(text).then(() => {
      alert('Handleliste kopiert til utklippstavlen!');
    });
  };

  const handleAddShop = () => {
    if (!newShop.trim() || !newShopUrl.trim()) return;
    addShop({ name: newShop.trim(), url: newShopUrl.trim() });
    setNewShop('');
    setNewShopUrl('https://');
  };

  const startEditShop = (id: string, name: string, url: string) => {
    setEditingShopId(id);
    setEditName(name);
    setEditUrl(url);
  };

  const saveEditShop = () => {
    if (!editingShopId || !editName.trim() || !editUrl.trim()) return;
    updateShop(editingShopId, { name: editName.trim(), url: editUrl.trim() });
    setEditingShopId(null);
  };

  return (
    <div>
      <div className="detail-header">
        <button className="back-btn" onClick={() => navigate('/')}>&#8592;</button>
        <div className="detail-title">Innstillinger</div>
      </div>

      <div className="settings-row" onClick={() => navigate('/kits')}>
        <span>Settbibliotek</span>
        <span className="chevron">&#8250;</span>
      </div>

      <div className="settings-row" onClick={handleExportJson}>
        <span>Eksporter data (JSON)</span>
        <span className="chevron">&#8595;</span>
      </div>

      <div className="settings-row" onClick={handleExportShopping}>
        <span>Kopier handleliste</span>
        <span className="chevron">&#128203;</span>
      </div>

      {/* Shop management */}
      <div className="section">
        <div className="section-title">Butikker</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {state.preferredShops.map((s) => (
            <div key={s.id} className="inventory-item" style={{ marginBottom: 0 }}>
              <div className="inventory-item-info">
                <div className="inventory-item-name">{s.name}</div>
                <div className="inventory-item-meta">{s.url}</div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn-icon" onClick={() => startEditShop(s.id, s.name, s.url)} title="Rediger">&#9998;</button>
                <button className="btn-icon delete" onClick={() => removeShop(s.id)} title="Slett">&times;</button>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            className="form-input"
            value={newShop}
            onChange={(e) => setNewShop(e.target.value)}
            placeholder="Nytt butikknavn..."
            style={{ flex: 1 }}
          />
          <input
            className="form-input"
            value={newShopUrl}
            onChange={(e) => setNewShopUrl(e.target.value)}
            placeholder="https://butikk.no/"
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary btn-sm" onClick={handleAddShop}>Legg til</button>
        </div>
        {editingShopId && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Rediger butikk</div>
            <input className="form-input" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Butikknavn" />
            <input className="form-input" value={editUrl} onChange={(e) => setEditUrl(e.target.value)} placeholder="https://butikk.no/" />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={saveEditShop}>Lagre</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingShopId(null)}>Avbryt</button>
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: 16, marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button className="btn btn-danger btn-full" onClick={() => setShowReset(true)}>
          Tilbakestill alt
        </button>
        <button className="btn btn-full" style={{ background: 'var(--text-muted)', color: 'white' }} onClick={logOut}>
          Logg ut
        </button>
      </div>

      <ConfirmDialog
        open={showReset}
        title="Tilbakestill alt?"
        message="Alle data slettes og verktøylisten tilbakestilles til standard. Denne handlingen kan ikke angres."
        confirmLabel="Tilbakestill"
        onConfirm={() => {
          resetAll();
          setShowReset(false);
          navigate('/');
        }}
        onCancel={() => setShowReset(false)}
      />
    </div>
  );
}
