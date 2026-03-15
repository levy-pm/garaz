import { useEffect, useState, useCallback } from 'react';
import {
  checkedVehiclesApi,
  settingsApi,
  profitabilityApi,
  type CheckedVehicle,
  type Settings,
  type ProfitabilityResult,
  type ProfitabilityRequest,
  type SourceRegion,
  type PurchaseCurrency,
  type CalcMode,
} from '../../api';
import { extractApiError } from '../../api/client';

// ── Formatting helpers ───────────────────────────────────────────────

function fmtPrice(v: number | null | undefined, currency = 'PLN'): string {
  if (v == null) return '—';
  const symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : 'zł';
  const formatted = v.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency === 'PLN' ? `${formatted} ${symbol}` : `${formatted} ${symbol}`;
}

function fmtPercent(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

// ── Component ────────────────────────────────────────────────────────

interface FormState {
  vehicleId: number | null;
  purchasePrice: number;
  purchaseCurrency: PurchaseCurrency;
  sourceRegion: SourceRegion;
  isNetto: boolean;
  mode: CalcMode;
  transportCost: number;
  registrationCost: number;
  translationCost: number;
  inspectionCost: number;
  appraiserCost: number;
  repairCost: number;
}

export default function ProfitabilityPage() {
  const [vehicles, setVehicles] = useState<CheckedVehicle[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProfitabilityResult | null>(null);

  const [form, setForm] = useState<FormState>({
    vehicleId: null,
    purchasePrice: 0,
    purchaseCurrency: 'EUR',
    sourceRegion: 'EU',
    isNetto: false,
    mode: 'AUCTION',
    transportCost: 0,
    registrationCost: 0,
    translationCost: 0,
    inspectionCost: 0,
    appraiserCost: 0,
    repairCost: 0,
  });

  // Load vehicles and settings
  useEffect(() => {
    Promise.all([
      checkedVehiclesApi.getAll({ limit: 1000 }),
      settingsApi.get(),
    ])
      .then(([vehiclesData, settingsData]) => {
        const activeVehicles = vehiclesData.items.filter(v => !v.isArchived);
        setVehicles(activeVehicles);
        setSettings(settingsData);
        // Pre-fill costs from settings
        setForm(prev => ({
          ...prev,
          transportCost: settingsData.transportCost,
          registrationCost: settingsData.registrationCost,
          translationCost: settingsData.translationCost,
          inspectionCost: settingsData.inspectionCost,
          appraiserCost: settingsData.expertCost,
          repairCost: settingsData.estimatedRepairCost,
        }));
      })
      .catch(() => setError('Nie udało się załadować danych.'))
      .finally(() => setLoading(false));
  }, []);

  const updateField = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setResult(null);
  }, []);

  const handleCalculate = useCallback(async () => {
    if (!form.vehicleId) {
      setError('Wybierz pojazd.');
      return;
    }
    if (form.purchasePrice <= 0 && form.mode !== 'MAX_BID') {
      setError('Podaj cenę zakupu większą od 0.');
      return;
    }

    setCalculating(true);
    setError(null);
    setResult(null);

    try {
      const request: ProfitabilityRequest = {
        vehicleId: form.vehicleId,
        purchasePrice: form.mode === 'MAX_BID' ? 0 : form.purchasePrice,
        purchaseCurrency: form.purchaseCurrency,
        sourceRegion: form.sourceRegion,
        isNetto: form.isNetto,
        mode: form.mode,
        transportCost: form.transportCost,
        registrationCost: form.registrationCost,
        translationCost: form.translationCost,
        inspectionCost: form.inspectionCost,
        appraiserCost: form.appraiserCost,
        repairCost: form.repairCost,
      };

      const data = await profitabilityApi.calculate(request);
      setResult(data);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setCalculating(false);
    }
  }, [form]);

  const selectedVehicle = vehicles.find(v => v.id === form.vehicleId);

  if (loading) return <div className="loading">Ładowanie kalkulatora...</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Kalkulator opłacalności</h1>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--red)', background: 'var(--red-bg)', marginBottom: 16 }}>
          <p style={{ margin: 0, color: 'var(--red)', fontSize: 14 }}>{error}</p>
        </div>
      )}

      {/* ── Form ── */}
      <div className="card">
        <h3 style={{ fontSize: 16, marginBottom: 16 }}>Dane zakupu</h3>

        {/* Vehicle select */}
        <div className="form-group">
          <label className="form-label">Pojazd</label>
          <select
            className="form-select"
            value={form.vehicleId ?? ''}
            onChange={e => updateField('vehicleId', e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">— Wybierz pojazd —</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>
                {v.make} {v.model} {v.year} {v.version ? `(${v.version})` : ''}
              </option>
            ))}
          </select>
        </div>

        {selectedVehicle && (
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)' }}>
            Silnik: {selectedVehicle.engineCapacity ?? '—'} l
            {selectedVehicle.horsepowerKM ? ` · ${selectedVehicle.horsepowerKM} KM` : ''}
            {selectedVehicle.fuelType ? ` · ${selectedVehicle.fuelType}` : ''}
            {selectedVehicle.mileageKm ? ` · ${selectedVehicle.mileageKm.toLocaleString('pl-PL')} km` : ''}
            {selectedVehicle.country ? ` · ${selectedVehicle.country}` : ''}
          </div>
        )}

        <div className="form-row">
          {/* Mode */}
          <div className="form-group">
            <label className="form-label">Tryb</label>
            <select
              className="form-select"
              value={form.mode}
              onChange={e => updateField('mode', e.target.value as CalcMode)}
            >
              <option value="AUCTION">Licytacja</option>
              <option value="BUY_NOW">Kup teraz</option>
              <option value="MAX_BID">Maks. cena zakupu</option>
            </select>
          </div>

          {/* Purchase price */}
          {form.mode !== 'MAX_BID' && (
            <div className="form-group">
              <label className="form-label">Cena zakupu</label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="100"
                value={form.purchasePrice || ''}
                onChange={e => updateField('purchasePrice', Number(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          )}

          {/* Currency */}
          <div className="form-group">
            <label className="form-label">Waluta</label>
            <select
              className="form-select"
              value={form.purchaseCurrency}
              onChange={e => updateField('purchaseCurrency', e.target.value as PurchaseCurrency)}
            >
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="PLN">PLN</option>
            </select>
          </div>

          {/* Source region */}
          <div className="form-group">
            <label className="form-label">Region pochodzenia</label>
            <select
              className="form-select"
              value={form.sourceRegion}
              onChange={e => updateField('sourceRegion', e.target.value as SourceRegion)}
            >
              <option value="EU">Unia Europejska (EU)</option>
              <option value="NON_EU">Spoza UE (NON_EU)</option>
            </select>
          </div>

          {/* isNetto */}
          <div className="form-group">
            <label className="form-label">Cena netto?</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 4 }}>
              <input
                type="checkbox"
                checked={form.isNetto}
                onChange={e => updateField('isNetto', e.target.checked)}
                style={{ width: 18, height: 18, accentColor: 'var(--accent)' }}
              />
              <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                {form.isNetto ? 'Tak (netto)' : 'Nie (brutto)'}
              </span>
            </label>
          </div>
        </div>

        {/* Additional costs */}
        <h3 style={{ fontSize: 14, marginBottom: 12, marginTop: 8, color: 'var(--text-secondary)' }}>Koszty dodatkowe (PLN)</h3>
        <div className="form-row">
          <CostField label="Transport" value={form.transportCost} onChange={v => updateField('transportCost', v)} />
          <CostField label="Rejestracja" value={form.registrationCost} onChange={v => updateField('registrationCost', v)} />
          <CostField label="Tłumaczenie" value={form.translationCost} onChange={v => updateField('translationCost', v)} />
          <CostField label="Przegląd" value={form.inspectionCost} onChange={v => updateField('inspectionCost', v)} />
          <CostField label="Rzeczoznawca" value={form.appraiserCost} onChange={v => updateField('appraiserCost', v)} />
          <CostField label="Naprawa" value={form.repairCost} onChange={v => updateField('repairCost', v)} />
        </div>

        {/* Exchange rate info */}
        {settings && form.purchaseCurrency !== 'PLN' && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, marginBottom: 0 }}>
            Kurs {form.purchaseCurrency}/PLN: {form.purchaseCurrency === 'EUR' ? settings.exchangeRateEUR : settings.exchangeRateUSD}
          </p>
        )}

        <div style={{ marginTop: 20 }}>
          <button
            className="btn btn-primary"
            onClick={handleCalculate}
            disabled={calculating || !form.vehicleId}
          >
            {calculating ? 'Obliczanie...' : form.mode === 'MAX_BID' ? 'Oblicz maksymalną cenę' : 'Oblicz opłacalność'}
          </button>
        </div>
      </div>

      {/* ── Results ── */}
      {result && <ProfitabilityResults result={result} settings={settings} />}
    </div>
  );
}

// ── Cost field ───────────────────────────────────────────────────────

function CostField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input
        className="form-input"
        type="number"
        min="0"
        step="50"
        value={value || ''}
        onChange={e => onChange(Number(e.target.value) || 0)}
        placeholder="0"
      />
    </div>
  );
}

// ── Results component ────────────────────────────────────────────────

function ProfitabilityResults({ result, settings }: { result: ProfitabilityResult; settings: Settings | null }) {
  const isProfitable = result.profitabilityDecision === 'PROFITABLE';
  const noData = result.profitabilityDecision === 'NO_MARKET_DATA';
  const isMaxBid = result.mode === 'MAX_BID';
  const showOriginalCurrency = result.purchaseCurrency !== 'PLN';

  return (
    <div>
      {/* ── Decision banner ── */}
      <div
        className="card"
        style={{
          borderColor: noData ? 'var(--orange)' : isProfitable ? 'var(--green)' : 'var(--red)',
          background: noData ? 'var(--orange-bg)' : isProfitable ? 'var(--green-bg)' : 'var(--red-bg)',
          textAlign: 'center',
          padding: '24px 20px',
        }}
      >
        {noData ? (
          <>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--orange)', marginBottom: 8 }}>
              BRAK DANYCH RYNKOWYCH
            </div>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>
              Brak ofert rynkowych dla tego pojazdu. Dodaj oferty rynkowe, aby obliczyć opłacalność.
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize: 24, fontWeight: 700, color: isProfitable ? 'var(--green)' : 'var(--red)', marginBottom: 8 }}>
              {isProfitable ? 'OPŁACA SIĘ' : 'NIE OPŁACA SIĘ'}
            </div>
            {result.netProfit !== null && (
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>
                Zysk netto: {fmtPrice(result.netProfit)} · ROI: {fmtPercent(result.roi)}
              </p>
            )}
          </>
        )}
      </div>

      {/* ── Max buy price banner ── */}
      {result.maxBuyPricePLN > 0 && (
        <div className="card" style={{ borderColor: 'rgba(88, 166, 255, 0.3)', background: 'rgba(88, 166, 255, 0.05)', textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
            {isMaxBid
              ? `Aby osiągnąć ROI ${settings?.desiredROI ?? 10}%, licytuj maksymalnie do`
              : `Do tej ceny licytuj`}
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
            {fmtPrice(result.maxBuyPricePLN)}
          </div>
          {showOriginalCurrency && (
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
              {fmtPrice(result.maxBuyPriceOriginalCurrency, result.purchaseCurrency)}
            </div>
          )}
        </div>
      )}

      {/* ── Market data ── */}
      {(result.avgMarketPrice !== null || result.medianMarketPrice !== null) && (
        <div className="card">
          <h3 style={{ fontSize: 14, marginBottom: 12 }}>Dane rynkowe (Polska)</h3>
          <div className="stats-grid">
            {result.avgMarketPrice !== null && (
              <div className="stat-card">
                <div className="stat-label">Średnia cena rynkowa</div>
                <div className="stat-value" style={{ fontSize: 20 }}>{fmtPrice(result.avgMarketPrice)}</div>
              </div>
            )}
            {result.medianMarketPrice !== null && (
              <div className="stat-card">
                <div className="stat-label">Mediana ceny rynkowej</div>
                <div className="stat-value" style={{ fontSize: 20 }}>{fmtPrice(result.medianMarketPrice)}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Cost breakdown ── */}
      {!isMaxBid && (
        <div className="card">
          <h3 style={{ fontSize: 14, marginBottom: 12 }}>Rozbicie kosztów</h3>
          <div className="profit-panel">
            <Row label="Cena zakupu (PLN)" value={fmtPrice(result.breakdown.basePricePLN)} />
            {result.breakdown.customsDuty > 0 && (
              <Row label="Cło" value={fmtPrice(result.breakdown.customsDuty)} />
            )}
            <Row label="Akcyza" value={fmtPrice(result.breakdown.exciseDuty)} />
            {result.breakdown.vatImport > 0 && (
              <Row label="VAT importowy" value={fmtPrice(result.breakdown.vatImport)} />
            )}
            <Separator />
            {result.breakdown.transportCost > 0 && <Row label="Transport" value={fmtPrice(result.breakdown.transportCost)} />}
            {result.breakdown.registrationCost > 0 && <Row label="Rejestracja" value={fmtPrice(result.breakdown.registrationCost)} />}
            {result.breakdown.translationCost > 0 && <Row label="Tłumaczenie" value={fmtPrice(result.breakdown.translationCost)} />}
            {result.breakdown.inspectionCost > 0 && <Row label="Przegląd" value={fmtPrice(result.breakdown.inspectionCost)} />}
            {result.breakdown.appraiserCost > 0 && <Row label="Rzeczoznawca" value={fmtPrice(result.breakdown.appraiserCost)} />}
            {result.breakdown.repairCost > 0 && <Row label="Naprawa" value={fmtPrice(result.breakdown.repairCost)} />}
            <Row label="Koszty stałe razem" value={fmtPrice(result.breakdown.fixedCosts)} bold />
            <Separator />
            <Row label="CAŁKOWITY KOSZT" value={fmtPrice(result.totalCosts)} bold accent />
          </div>
        </div>
      )}

      {/* ── Profit summary ── */}
      {!noData && !isMaxBid && (
        <div className="card">
          <h3 style={{ fontSize: 14, marginBottom: 12 }}>Podsumowanie zysku</h3>
          <div className="profit-panel">
            <Row label="Średnia cena rynkowa" value={fmtPrice(result.avgMarketPrice)} />
            <Row label="Całkowity koszt" value={fmtPrice(result.totalCosts)} />
            <Separator />
            <Row
              label="Zysk brutto"
              value={fmtPrice(result.grossProfit)}
              color={result.grossProfit !== null && result.grossProfit > 0 ? 'var(--green)' : 'var(--red)'}
            />
            <Row label="Podatek dochodowy (19%)" value={fmtPrice(result.incomeTax)} />
            <Row
              label="ZYSK NETTO"
              value={fmtPrice(result.netProfit)}
              bold
              color={result.netProfit !== null && result.netProfit > 0 ? 'var(--green)' : 'var(--red)'}
            />
            <Row
              label="ROI"
              value={fmtPercent(result.roi)}
              bold
              color={result.roi !== null && result.roi > 0 ? 'var(--green)' : 'var(--red)'}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Row helpers ──────────────────────────────────────────────────────

function Row({ label, value, bold, color, accent }: {
  label: string;
  value: string;
  bold?: boolean;
  color?: string;
  accent?: boolean;
}) {
  return (
    <div className={`profit-row ${bold ? 'profit-total' : ''}`} style={bold && !accent ? { borderTop: 'none', marginTop: 0, paddingTop: 8 } : undefined}>
      <span className="label">{label}</span>
      <span
        className="value"
        style={{
          color: color || (accent ? 'var(--accent)' : undefined),
          fontSize: bold ? 16 : undefined,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Separator() {
  return <div style={{ borderBottom: '1px solid var(--border-color)', margin: '4px 0' }} />;
}
