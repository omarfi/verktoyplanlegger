import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, useAuth } from '../store';
import { ConfirmDialog } from '../components/Modal';

export function SettingsScreen() {
  const { state, resetAll, addShop } = useApp();
  const { logOut } = useAuth();
  const navigate = useNavigate();
  const [showReset, setShowReset] = useState(false);
  const [newShop, setNewShop] = useState('');

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
    if (!newShop.trim()) return;
    addShop(newShop.trim());
    setNewShop('');
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
        <div className="kit-contents-list" style={{ marginBottom: 12 }}>
          {state.preferredShops.map((s) => (
            <span key={s} className="kit-content-tag">{s}</span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="form-input"
            value={newShop}
            onChange={(e) => setNewShop(e.target.value)}
            placeholder="Ny butikk..."
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary btn-sm" onClick={handleAddShop}>Legg til</button>
        </div>
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
