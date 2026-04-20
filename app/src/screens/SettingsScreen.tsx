import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store';
import { ConfirmDialog } from '../components/Modal';

export function SettingsScreen() {
  const { state, resetAll } = useApp();
  const navigate = useNavigate();
  const [showReset, setShowReset] = useState(false);

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
        if (c.price !== null) {
          items.push({ name: t.name, shop: c.shop, price: c.price });
        }
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

  return (
    <div>
      <div className="detail-header">
        <button className="back-btn" onClick={() => navigate('/')}>←</button>
        <div className="detail-title">Innstillinger</div>
      </div>

      <div className="settings-row" onClick={() => navigate('/kits')}>
        <span>Settbibliotek</span>
        <span className="chevron">›</span>
      </div>

      <div className="settings-row" onClick={handleExportJson}>
        <span>Eksporter data (JSON)</span>
        <span className="chevron">↓</span>
      </div>

      <div className="settings-row" onClick={handleExportShopping}>
        <span>Kopier handleliste</span>
        <span className="chevron">📋</span>
      </div>

      <div style={{ padding: 16, marginTop: 32 }}>
        <button className="btn btn-danger btn-full" onClick={() => setShowReset(true)}>
          Tilbakestill alt
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
