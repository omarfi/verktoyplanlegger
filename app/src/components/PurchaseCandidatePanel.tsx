import { useState } from 'react';
import type { PurchaseOption } from '../types';
import { formatNok, generateId } from '../logic';
import { ToolImage } from './ToolImage';

interface Props {
  options: PurchaseOption[];
  selectedId: string | null;
  onSave: (option: PurchaseOption) => void;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

interface Draft {
  id: string;
  url: string;
  canonicalUrl: string;
  retailer: string;
  productName: string;
  imageUrl: string;
  priceText: string;
  availability: PurchaseOption['availability'];
}

const RETAILERS: [string, string][] = [
  ['jula.no', 'Jula'],
  ['biltema.no', 'Biltema'],
  ['maxbo.no', 'Maxbo'],
  ['obsbygg.no', 'Coop Obs BYGG'],
];

function retailerFromUrl(url: URL): string {
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  return RETAILERS.find(([domain]) => host === domain || host.endsWith(`.${domain}`))?.[1] ?? host;
}

function priceMinor(value: string): number | null {
  const normalized = value.trim().replace(/\s/g, '').replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : null;
}

function draftFromOption(option: PurchaseOption): Draft {
  return {
    id: option.id,
    url: option.url,
    canonicalUrl: option.canonicalUrl,
    retailer: option.retailer,
    productName: option.productName,
    imageUrl: option.imageUrl,
    priceText: option.priceMinor === null ? '' : String(option.priceMinor / 100).replace('.', ','),
    availability: option.availability,
  };
}

export function PurchaseCandidatePanel({ options, selectedId, onSave, onSelect, onRemove }: Props) {
  const [url, setUrl] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);

  const beginAdd = () => {
    setError(null);
    let parsed: URL;
    try {
      parsed = new URL(url);
      if (parsed.protocol !== 'https:') throw new Error();
    } catch {
      setError('Lim inn en gyldig https-adresse til produktet.');
      return;
    }
    parsed.hash = '';
    setDraft({
      id: generateId(),
      url: parsed.href,
      canonicalUrl: parsed.href,
      retailer: retailerFromUrl(parsed),
      productName: '',
      imageUrl: '',
      priceText: '',
      availability: 'unknown',
    });
  };

  const beginEdit = (option: PurchaseOption) => {
    setUrl(option.url);
    setDraft(draftFromOption(option));
    setError(null);
  };

  const saveDraft = () => {
    if (!draft?.productName.trim() || !draft.retailer.trim()) {
      setError('Produktnavn og butikk må fylles inn.');
      return;
    }
    onSave({
      id: draft.id,
      url: draft.url,
      canonicalUrl: draft.canonicalUrl || draft.url,
      retailer: draft.retailer.trim(),
      productName: draft.productName.trim(),
      imageUrl: draft.imageUrl.trim(),
      priceMinor: priceMinor(draft.priceText),
      currency: 'NOK',
      availability: draft.availability,
      fetchedAt: new Date().toISOString(),
    });
    setDraft(null);
    setUrl('');
    setError(null);
  };

  return (
    <div className="purchase-panel">
      <div className="purchase-options">
        {options.map((option) => {
          const selected = selectedId === option.id;
          return (
            <article className={`purchase-option${selected ? ' is-selected' : ''}`} key={option.id}>
              <span className="purchase-option-image"><ToolImage src={option.imageUrl} alt="" /></span>
              <div className="purchase-option-copy">
                <div><strong>{option.productName}</strong>{selected && <span className="purchase-selected-tag">Valgt</span>}</div>
                <small>{option.retailer} · {option.priceMinor === null ? 'Pris mangler' : formatNok(option.priceMinor)}</small>
                <small>Registrert {new Date(option.fetchedAt).toLocaleDateString('nb-NO')}</small>
              </div>
              <div className="purchase-option-actions">
                {!selected && <button onClick={() => onSelect(option.id)}>Velg</button>}
                <a href={option.url} target="_blank" rel="noreferrer">Åpne</a>
                <button onClick={() => beginEdit(option)}>Rediger</button>
                <button className="danger" onClick={() => onRemove(option.id)}>Fjern</button>
              </div>
            </article>
          );
        })}
        {!options.length && <p className="purchase-empty">Ingen kandidater ennå. Lim inn en produktadresse og registrer detaljene.</p>}
      </div>

      {!draft && (
        <div className="purchase-add-row">
          <label className="sr-only" htmlFor="purchase-url">Produktadresse</label>
          <input id="purchase-url" type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://butikk.no/produkt…" />
          <button onClick={beginAdd} disabled={!url.trim()}>Legg til</button>
        </div>
      )}

      {draft && (
        <div className="purchase-preview">
          <strong>Legg inn produktdata</strong>
          <small className="purchase-help">Butikken er foreslått fra URL-en. Kontroller navn og pris mot produktsiden.</small>
          <div className="two-fields">
            <label>Produktnavn<input className="form-input" value={draft.productName} onChange={(event) => setDraft({ ...draft, productName: event.target.value })} placeholder="F.eks. Batteridrill 18 V" /></label>
            <label>Butikk<input className="form-input" value={draft.retailer} onChange={(event) => setDraft({ ...draft, retailer: event.target.value })} /></label>
          </div>
          <div className="two-fields">
            <label>Pris i kroner<input className="form-input" inputMode="decimal" value={draft.priceText} onChange={(event) => setDraft({ ...draft, priceText: event.target.value })} placeholder="999,00" /></label>
            <label>Bilde-URL <small>(valgfritt)</small><input className="form-input" type="url" value={draft.imageUrl} onChange={(event) => setDraft({ ...draft, imageUrl: event.target.value })} /></label>
          </div>
          <div className="purchase-preview-actions"><button className="secondary-button" onClick={() => setDraft(null)}>Avbryt</button><button className="primary-button" onClick={saveDraft}>Lagre kandidat</button></div>
        </div>
      )}
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}
