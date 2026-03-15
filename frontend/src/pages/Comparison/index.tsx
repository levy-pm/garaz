import { useEffect, useState, useCallback } from 'react';
import {
  checkedVehiclesApi,
  comparisonApi,
  type CheckedVehicle,
  type ComparisonResponse,
  type VehicleComparison,
} from '../../api';
import { extractApiError } from '../../api/client';

const fmtPrice = (v: number | null | undefined) => {
  if (v == null) return '—';
  return v.toLocaleString('pl-PL') + ' zł';
};

const fmtKm = (v: number | null | undefined) => {
  if (v == null) return '—';
  return v.toLocaleString('pl-PL') + ' km';
};

const fmtPercent = (v: number | null | undefined) => {
  if (v == null) return '—';
  return v.toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
};

export default function ComparisonPage() {
  const [vehicles, setVehicles] = useState<CheckedVehicle[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [comparison, setComparison] = useState<ComparisonResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkedVehiclesApi.getAll({ limit: 1000 })
      .then(res => setVehicles(res.items.filter(v => !v.isArchived)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleVehicle = useCallback((id: number) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
    setComparison(null);
  }, []);

  const handleCompare = useCallback(async () => {
    if (selectedIds.length < 2) {
      setError('Wybierz co najmniej 2 pojazdy.');
      return;
    }
    setComparing(true);
    setError(null);
    try {
      const result = await comparisonApi.compare(selectedIds);
      setComparison(result);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setComparing(false);
    }
  }, [selectedIds]);

  if (loading) return <div className="loading">Ładowanie...</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Porównanie pojazdów</h1>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--red)', background: 'var(--red-bg)', marginBottom: 16 }}>
          <p style={{ margin: 0, color: 'var(--red)', fontSize: 14 }}>{error}</p>
        </div>
      )}

      {/* Vehicle selector */}
      <div className="card">
        <h3 style={{ fontSize: 14, marginBottom: 12, color: 'var(--text-secondary)' }}>
          Wybierz 2–3 pojazdy do porównania ({selectedIds.length}/3)
        </h3>
        <div style={{ maxHeight: 300, overflow: 'auto' }}>
          {vehicles.map(v => {
            const isSelected = selectedIds.includes(v.id);
            const isDisabled = !isSelected && selectedIds.length >= 3;
            return (
              <label
                key={v.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  opacity: isDisabled ? 0.4 : 1,
                  background: isSelected ? 'rgba(88, 166, 255, 0.06)' : undefined,
                  borderRadius: 'var(--radius)',
                  marginBottom: 2,
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={isDisabled}
                  onChange={() => toggleVehicle(v.id)}
                  style={{ width: 18, height: 18, accentColor: 'var(--accent)' }}
                />
                <span style={{ fontWeight: 600, fontSize: 14 }}>{v.make} {v.model}</span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {v.year} · {v.fuelType || '—'} · {v.engineCapacity ? `${v.engineCapacity} l` : '—'}
                  {v.mileageKm ? ` · ${fmtKm(v.mileageKm)}` : ''}
                </span>
              </label>
            );
          })}
          {vehicles.length === 0 && (
            <div className="empty-state"><p>Brak pojazdów. Dodaj pojazdy w zakładce "Sprawdzane pojazdy".</p></div>
          )}
        </div>

        <button
          className="btn btn-primary"
          onClick={handleCompare}
          disabled={selectedIds.length < 2 || comparing}
          style={{ marginTop: 12 }}
        >
          {comparing ? 'Porównywanie...' : 'Porównaj'}
        </button>
      </div>

      {/* Comparison results */}
      {comparison && <ComparisonView data={comparison} />}
    </div>
  );
}

// ── Comparison View ──────────────────────────────────────────────────

function ComparisonView({ data }: { data: ComparisonResponse }) {
  const { comparisons } = data;
  const count = comparisons.length;
  const colWidth = count === 2 ? '50%' : '33.33%';

  return (
    <div>
      {/* Specification */}
      <div className="card">
        <h3 style={{ fontSize: 14, marginBottom: 12 }}>Specyfikacja techniczna</h3>
        <CompareTable
          comparisons={comparisons}
          colWidth={colWidth}
          rows={[
            { label: 'Marka / Model', render: c => <strong>{c.vehicle.make} {c.vehicle.model}</strong> },
            { label: 'Rok', render: c => String(c.vehicle.year) },
            { label: 'Wersja', render: c => c.vehicle.version || '—' },
            { label: 'Nadwozie', render: c => c.vehicle.bodyType || '—' },
            { label: 'Paliwo', render: c => c.vehicle.fuelType || '—' },
            { label: 'Pojemność', render: c => c.vehicle.engineCapacity ? `${c.vehicle.engineCapacity} l` : '—' },
            { label: 'Moc', render: c => c.vehicle.horsepowerKM ? `${c.vehicle.horsepowerKM} KM` : '—' },
            { label: 'Skrzynia', render: c => c.vehicle.transmission || '—' },
            { label: 'Napęd', render: c => c.vehicle.driveType || '—' },
            {
              label: 'Przebieg',
              render: c => fmtKm(c.vehicle.mileageKm),
              best: (vals) => bestMin(vals.map(c => c.vehicle.mileageKm)),
            },
            { label: 'Kolor', render: c => c.vehicle.color || '—' },
            { label: 'Kraj', render: c => c.vehicle.country || '—' },
            {
              label: 'Bezwypadkowy',
              render: c => c.vehicle.accidentFree
                ? <span className="badge badge-green">Tak</span>
                : <span className="badge badge-red">Nie ({c.vehicle.accidentCount})</span>,
            },
            {
              label: 'Cena pojazdu',
              render: c => fmtPrice(c.vehicle.pricePLN),
              best: (vals) => bestMin(vals.map(c => c.vehicle.pricePLN)),
            },
          ]}
        />
      </div>

      {/* Market data */}
      <div className="card">
        <h3 style={{ fontSize: 14, marginBottom: 12 }}>Dane rynkowe</h3>
        <CompareTable
          comparisons={comparisons}
          colWidth={colWidth}
          rows={[
            {
              label: 'Liczba ofert',
              render: c => String(c.marketData.offerCount),
              best: (vals) => bestMax(vals.map(c => c.marketData.offerCount)),
            },
            { label: 'Średnia cena', render: c => fmtPrice(c.marketData.avgPrice) },
            { label: 'Mediana', render: c => fmtPrice(c.marketData.medianPrice) },
            { label: 'Min cena', render: c => fmtPrice(c.marketData.minPrice) },
            { label: 'Max cena', render: c => fmtPrice(c.marketData.maxPrice) },
            { label: 'Średni przebieg', render: c => fmtKm(c.marketData.avgMileage) },
            { label: 'Cena proponowana', render: c => fmtPrice(c.marketData.proposedPrice) },
            {
              label: 'Cena po korekcie wypadkowej',
              render: c => {
                if (c.marketData.accidentDiscount > 0) {
                  return (
                    <span>
                      {fmtPrice(c.marketData.proposedPriceAdjusted)}
                      <span style={{ fontSize: 11, color: 'var(--red)', marginLeft: 4 }}>
                        (-{c.marketData.accidentDiscount}%)
                      </span>
                    </span>
                  );
                }
                return fmtPrice(c.marketData.proposedPriceAdjusted);
              },
            },
          ]}
        />
      </div>

      {/* Profitability */}
      <div className="card">
        <h3 style={{ fontSize: 14, marginBottom: 12 }}>Kalkulacja opłacalności</h3>
        <CompareTable
          comparisons={comparisons}
          colWidth={colWidth}
          rows={[
            {
              label: 'Całkowity koszt',
              render: c => c.profitability ? fmtPrice(c.profitability.totalCosts) : '—',
              best: (vals) => bestMin(vals.map(c => c.profitability?.totalCosts ?? null)),
            },
            {
              label: 'Zysk brutto',
              render: c => {
                if (!c.profitability) return '—';
                const v = c.profitability.grossProfit;
                return <span style={{ color: v != null && v > 0 ? 'var(--green)' : 'var(--red)' }}>{fmtPrice(v)}</span>;
              },
              best: (vals) => bestMax(vals.map(c => c.profitability?.grossProfit ?? null)),
            },
            {
              label: 'Zysk netto',
              render: c => {
                if (!c.profitability) return '—';
                const v = c.profitability.netProfit;
                return <span style={{ color: v != null && v > 0 ? 'var(--green)' : 'var(--red)' }}>{fmtPrice(v)}</span>;
              },
              best: (vals) => bestMax(vals.map(c => c.profitability?.netProfit ?? null)),
            },
            {
              label: 'ROI',
              render: c => {
                if (!c.profitability) return '—';
                const v = c.profitability.roi;
                return <span style={{ color: v != null && v > 0 ? 'var(--green)' : 'var(--red)' }}>{fmtPercent(v)}</span>;
              },
              best: (vals) => bestMax(vals.map(c => c.profitability?.roi ?? null)),
            },
            {
              label: 'Max cena zakupu',
              render: c => c.profitability ? fmtPrice(c.profitability.maxBuyPricePLN) : '—',
            },
            {
              label: 'Status',
              render: c => {
                if (!c.profitability) return <span style={{ color: 'var(--text-muted)' }}>Brak danych</span>;
                const profitable = c.profitability.profitabilityDecision === 'PROFITABLE';
                return (
                  <span className={`badge ${profitable ? 'badge-green' : 'badge-red'}`}>
                    {profitable ? 'OPŁACA SIĘ' : 'NIE OPŁACA SIĘ'}
                  </span>
                );
              },
            },
          ]}
        />
      </div>

      {/* Equipment */}
      {comparisons.some(c => c.vehicle.equipment) && (
        <div className="card">
          <h3 style={{ fontSize: 14, marginBottom: 12 }}>Wyposażenie</h3>
          <div style={{ display: 'flex', gap: 16 }}>
            {comparisons.map(c => (
              <div key={c.vehicle.id} style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  {c.vehicle.make} {c.vehicle.model}
                </div>
                {c.vehicle.equipment ? (
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                    {c.vehicle.equipment.split(/[,;]/).map((item, i) => (
                      <span key={i} className="badge" style={{ margin: '2px 4px 2px 0', background: 'var(--bg-tertiary)', fontSize: 11 }}>
                        {item.trim()}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Brak danych</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Compare table ────────────────────────────────────────────────────

interface CompareRow {
  label: string;
  render: (c: VehicleComparison) => React.ReactNode;
  best?: (comparisons: VehicleComparison[]) => number;
}

function CompareTable({ comparisons, colWidth, rows }: {
  comparisons: VehicleComparison[];
  colWidth: string;
  rows: CompareRow[];
}) {
  return (
    <div>
      {rows.map((row, ri) => {
        const bestIdx = row.best ? row.best(comparisons) : -1;
        return (
          <div key={ri} className="profit-row" style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ flex: '0 0 160px', fontSize: 13, color: 'var(--text-secondary)' }}>
              {row.label}
            </div>
            {comparisons.map((c, ci) => (
              <div
                key={c.vehicle.id}
                style={{
                  flex: 1,
                  fontSize: 13,
                  fontFamily: 'var(--font-mono)',
                  fontWeight: ci === bestIdx ? 700 : 400,
                  color: ci === bestIdx ? 'var(--accent)' : 'var(--text-primary)',
                }}
              >
                {row.render(c)}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ── Best value helpers ───────────────────────────────────────────────

function bestMin(values: (number | null | undefined)[]): number {
  let best = -1;
  let bestVal = Infinity;
  values.forEach((v, i) => {
    if (v != null && v < bestVal) { bestVal = v; best = i; }
  });
  return best;
}

function bestMax(values: (number | null | undefined)[]): number {
  let best = -1;
  let bestVal = -Infinity;
  values.forEach((v, i) => {
    if (v != null && v > bestVal) { bestVal = v; best = i; }
  });
  return best;
}
