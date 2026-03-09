import { useEffect, useState } from 'react';
import { checkedVehiclesApi, marketStatsApi, type CheckedVehicle, type MarketStats } from '../../api';
import ComparisonIndicator from '../../components/ComparisonIndicator';

const fmtPrice = (v: number) => v.toLocaleString('pl-PL') + ' zł';
const fmtKm = (v: number) => v.toLocaleString('pl-PL') + ' km';
const fmtDate = (d: string) => new Date(d).toLocaleDateString('pl-PL');

export default function StartPage() {
  const [vehicles, setVehicles] = useState<CheckedVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewVehicle, setPreviewVehicle] = useState<CheckedVehicle | null>(null);
  const [previewStats, setPreviewStats] = useState<MarketStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      const res = await checkedVehiclesApi.getAll({ limit: 20, sortBy: 'createdAt', sortOrder: 'desc' });
      setVehicles(res.items);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const openPreview = async (v: CheckedVehicle) => {
    setPreviewVehicle(v);
    setStatsLoading(true);
    try {
      const stats = await marketStatsApi.getForVehicle(v.id);
      setPreviewStats(stats);
    } catch {
      setPreviewStats(null);
    } finally {
      setStatsLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewVehicle(null);
    setPreviewStats(null);
  };

  if (loading) return <div className="loading">Ładowanie...</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Start</h1>
      </div>

      <h3 style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 16 }}>Ostatnio sprawdzane auta</h3>

      {vehicles.length === 0 ? (
        <div className="empty-state">
          <p>Brak sprawdzanych pojazdów. Dodaj pierwszy pojazd w zakładce "Sprawdzane pojazdy".</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Typ</th>
                <th>Marka</th>
                <th>Model</th>
                <th>Rok</th>
                <th>Podgląd</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map(v => (
                <tr key={v.id}>
                  <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>{fmtDate(v.createdAt)}</td>
                  <td>{v.vehicleType}</td>
                  <td style={{ fontWeight: 600 }}>{v.make}</td>
                  <td>{v.model}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{v.year}</td>
                  <td>
                    <button className="btn btn-sm" onClick={() => openPreview(v)}>Podgląd</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Preview Modal */}
      {previewVehicle && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closePreview(); }}>
          <div className="modal" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3 className="modal-title">{previewVehicle.make} {previewVehicle.model} ({previewVehicle.year})</h3>
              <button className="btn-icon" onClick={closePreview} style={{ fontSize: 18 }}>✕</button>
            </div>
            <div className="modal-body">
              {/* Vehicle details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', marginBottom: 24 }}>
                <DetailRow label="Typ pojazdu" value={previewVehicle.vehicleType} />
                <DetailRow label="Marka" value={previewVehicle.make} />
                <DetailRow label="Model" value={previewVehicle.model} />
                <DetailRow label="Rok" value={String(previewVehicle.year)} />
                <DetailRow label="Pojemność" value={previewVehicle.engineCapacity ? `${previewVehicle.engineCapacity} l` : '—'} />
                <DetailRow label="Moc" value={previewVehicle.horsepowerKM ? `${previewVehicle.horsepowerKM} KM` : '—'} />
                {previewVehicle.vehicleType !== 'Motocykl' && (
                  <DetailRow label="Skrzynia biegów" value={previewVehicle.transmission || '—'} />
                )}
              </div>

              {statsLoading ? (
                <div className="loading" style={{ padding: 24 }}>Ładowanie danych rynkowych...</div>
              ) : previewStats ? (
                <>
                  {/* Market averages */}
                  <h4 style={{ fontSize: 13, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Dane rynkowe</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                    <div className="stat-card">
                      <div className="stat-label">Średnia cena rynkowa</div>
                      <div className="stat-value" style={{ fontSize: 18 }}>
                        {previewStats.yearStats.avgPrice != null ? fmtPrice(Math.round(previewStats.yearStats.avgPrice)) : '—'}
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Średni przebieg rynkowy</div>
                      <div className="stat-value" style={{ fontSize: 18 }}>
                        {previewStats.yearStats.avgMileage != null ? fmtKm(Math.round(previewStats.yearStats.avgMileage)) : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Vehicle vs market */}
                  <h4 style={{ fontSize: 13, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Pojazd vs rynek</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                    <div className="stat-card">
                      <div className="stat-label">Cena pojazdu</div>
                      <div className="stat-value" style={{ fontSize: 18 }}>
                        <ComparisonIndicator
                          value={previewVehicle.pricePLN}
                          marketAvg={previewStats.yearStats.avgPrice}
                          format={fmtPrice}
                        />
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-label">Przebieg pojazdu</div>
                      <div className="stat-value" style={{ fontSize: 18 }}>
                        <ComparisonIndicator
                          value={previewVehicle.mileageKm}
                          marketAvg={previewStats.yearStats.avgMileage}
                          format={fmtKm}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Proposed price */}
                  {previewStats.proposedPrice != null && (
                    <div className="stat-card" style={{ borderColor: 'var(--accent)', background: 'rgba(88, 166, 255, 0.04)' }}>
                      <div className="stat-label">Proponowana cena</div>
                      <div className="stat-value" style={{ color: 'var(--accent)' }}>
                        {fmtPrice(previewStats.proposedPrice)}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        Na podstawie mediany i średnich cen rynkowych z uwzględnieniem przebiegu
                      </div>
                    </div>
                  )}

                  {previewStats.yearStats.count === 0 && (
                    <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 12 }}>
                      Brak ofert rynkowych do porównania. Dodaj oferty w zakładce "Oferty rynkowe".
                    </div>
                  )}
                </>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 12 }}>
                  Nie udało się załadować danych rynkowych.
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={closePreview}>Zamknij</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</div>
      <div style={{ fontWeight: 500 }}>{value}</div>
    </div>
  );
}
