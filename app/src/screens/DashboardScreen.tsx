import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store';
import { getStatus, calculateGaps } from '../logic';

export function DashboardScreen() {
  const { state } = useApp();
  const navigate = useNavigate();

  const analysis = useMemo(() => {
    const toolsWithStatus = state.tools.map((t) => ({
      ...t,
      status: getStatus(t),
      gaps: t.inventoryDone ? calculateGaps(t) : null,
    }));

    const done = toolsWithStatus.filter((t) => t.status === 'done').length;
    const gap = toolsWithStatus.filter((t) => t.status === 'gap').length;
    const shopping = toolsWithStatus.filter((t) => t.status === 'shopping').length;

    // Shopping list: tools with a chosen candidate
    const shoppingList: { name: string; shop: string; price: number; toolId: string }[] = [];
    for (const t of toolsWithStatus) {
      if (t.chosen !== null && t.candidates[t.chosen]) {
        const c = t.candidates[t.chosen];
        shoppingList.push({ name: t.name, shop: c.shop, price: c.price, toolId: t.id });
      }
    }

    // Group by shop
    const byShop = new Map<string, typeof shoppingList>();
    for (const item of shoppingList) {
      if (!byShop.has(item.shop)) byShop.set(item.shop, []);
      byShop.get(item.shop)!.push(item);
    }

    const totalCost = shoppingList.reduce((sum, i) => sum + i.price, 0);

    // Move list
    const moveList = toolsWithStatus
      .filter((t) => t.status === 'move' || (t.gaps?.needsMove === 'parents-to-mine'))
      .map((t) => ({ name: t.name, toolId: t.id }));

    // Unresolved gaps
    const unresolvedGaps = toolsWithStatus
      .filter((t) => t.status === 'gap')
      .map((t) => ({ name: t.name, toolId: t.id }));

    // Kit suggestions
    const kitSuggestions: { kit: typeof state.kits[0]; covers: string[]; individualCost: number; saving: number }[] = [];
    const shoppingToolIds = new Set(shoppingList.map((s) => s.toolId));
    const gapToolIds = new Set(unresolvedGaps.map((g) => g.toolId));
    const allNeededIds = new Set([...shoppingToolIds, ...gapToolIds]);

    for (const kit of state.kits) {
      const covered = kit.contents.filter((id) => allNeededIds.has(id));
      if (covered.length >= 2) {
        let indCost = 0;
        for (const id of covered) {
          const item = shoppingList.find((s) => s.toolId === id);
          if (item) indCost += item.price;
        }
        const saving = indCost - kit.price;
        if (saving > 0) {
          kitSuggestions.push({ kit, covers: covered, individualCost: indCost, saving });
        }
      }
    }
    kitSuggestions.sort((a, b) => b.saving - a.saving);

    return { done, gap, shopping, byShop, totalCost, moveList, unresolvedGaps, kitSuggestions, total: state.tools.length };
  }, [state]);

  return (
    <div>
      <div className="header">
        <div className="header-title">Oversikt</div>
      </div>

      {/* Stats */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#065f46' }}>{analysis.done}</div>
          <div className="stat-label">Ferdig</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#991b1b' }}>{analysis.gap}</div>
          <div className="stat-label">Mangler</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#1e3a5f' }}>{analysis.shopping}</div>
          <div className="stat-label">Handler</div>
        </div>
      </div>

      {/* Shopping list */}
      <div className="section">
        <div className="section-title">Handleliste</div>
      </div>

      {analysis.byShop.size > 0 ? (
        <>
          {Array.from(analysis.byShop.entries()).map(([shop, items]) => {
            const shopTotal = items.reduce((s, i) => s + i.price, 0);
            return (
              <div key={shop} className="shop-group">
                <div className="shop-group-header">
                  <span className="shop-group-name">{shop}</span>
                  <span className="shop-group-total">{shopTotal} kr</span>
                </div>
                {items.map((item, i) => (
                  <div key={i} className="shop-group-row">
                    <span>{item.name}</span>
                    <span>{item.price} kr</span>
                  </div>
                ))}
              </div>
            );
          })}
          <div className="total-bar">
            <span className="total-label">Totalt</span>
            <span className="total-amount">{analysis.totalCost} kr</span>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-state-text">Ingen valgte kjøp ennå</div>
        </div>
      )}

      {/* Move list */}
      {analysis.moveList.length > 0 && (
        <>
          <div className="section">
            <div className="section-title">Flytteliste</div>
          </div>
          {analysis.moveList.map((item) => (
            <div key={item.toolId} className="move-row" onClick={() => navigate(`/tool/${item.toolId}`)}>
              <span>{item.name}</span>
              <span className="move-direction">Østerliveien → Raschs Vei</span>
            </div>
          ))}
        </>
      )}

      {/* Unresolved gaps */}
      {analysis.unresolvedGaps.length > 0 && (
        <>
          <div className="section">
            <div className="section-title">Uløste mangler ({analysis.unresolvedGaps.length})</div>
          </div>
          {analysis.unresolvedGaps.map((item) => (
            <div key={item.toolId} className="gap-card" onClick={() => navigate(`/tool/${item.toolId}`)}>
              <span>{item.name}</span>
              <span style={{ fontSize: 12, color: '#991b1b' }}>Trenger kandidater ›</span>
            </div>
          ))}
        </>
      )}

      {/* Kit suggestions */}
      {analysis.kitSuggestions.length > 0 && (
        <>
          <div className="section">
            <div className="section-title">Settforslag</div>
          </div>
          {analysis.kitSuggestions.map((s) => (
            <div key={s.kit.id} className="kit-suggestion">
              <div className="kit-suggestion-title">{s.kit.name}</div>
              <div className="kit-suggestion-meta">{s.kit.shop} · {s.kit.price} kr</div>
              <div className="kit-suggestion-meta">Dekker {s.covers.length} verktøy fra handlelisten</div>
              <div className="kit-suggestion-saving">Sparer {s.saving} kr vs. enkeltkjøp</div>
            </div>
          ))}
        </>
      )}

      <div style={{ height: 32 }} />
    </div>
  );
}
