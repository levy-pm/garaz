import { useEffect, useState } from 'react';
import { checkedVehiclesApi, marketAnalysisApi, type CheckedVehicle, type MarketAnalysis } from '../../api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';

export default function MarketCheckPage() {
  const [vehicles, setVehicles] = useState<CheckedVehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkedVehiclesApi.getAll({ limit: 100 }).then(res => setVehicles(res.items)).catch(() => {});
  }, []);

  const fetchAnalysis = async () => {
    if (!selectedVehicleId) return;
    setLoading(true);
    try {
      const data = await marketAnalysisApi.get(selectedVehicleId, dateFrom || undefined, dateTo || undefined);
      setAnalysis(data);
    } catch {
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  };

  const chartData = analysis?.trends.map(t => ({
    month: t.month,
    'Śr. cena': t.avgPrice ? Math.round(t.avgPrice) : null,
    'Śr. przebieg': t.avgMileage ? Math.round(t.avgMileage) : null,
    'Bezwypadkowość (%)': t.accidentFreeRate ? Math.round(t.accidentFreeRate) : null,
    'Liczba ofert': t.offerCount,
  })) || [];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Sprawdź rynek</h1>
      </div>

      <div className="card">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Wybierz pojazd</label>
            <select
              className="form-select"
              value={selectedVehicleId || ''}
              onChange={e => setSelectedVehicleId(Number(e.target.value) || null)}
            >
              <option value="">Wybierz pojazd...</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.make} {v.model} ({v.year})</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Data od</label>
            <input className="form-input" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Data do</label>
            <input className="form-input" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn btn-primary" onClick={fetchAnalysis} disabled={!selectedVehicleId || loading}>
              {loading ? 'Ładowanie...' : 'Analizuj'}
            </button>
          </div>
        </div>
      </div>

      {analysis && (
        <>
          <div className="stats-grid" style={{ marginTop: 24 }}>
            <div className="stat-card">
              <div className="stat-label">Pojazd</div>
              <div className="stat-value" style={{ fontSize: 16 }}>
                {analysis.vehicle.make} {analysis.vehicle.model}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Rocznik</div>
              <div className="stat-value" style={{ fontSize: 16 }}>{analysis.vehicle.year}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Łącznie ofert</div>
              <div className="stat-value" style={{ fontSize: 16 }}>{analysis.totalOffers}</div>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="empty-state">
              <p>Brak danych w wybranym zakresie dat. Dodaj oferty rynkowe, aby zobaczyć trendy.</p>
            </div>
          ) : (
            <>
              {/* Price trend */}
              <div className="chart-container">
                <div className="chart-title">Zmiana średniej ceny w czasie</div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                    <XAxis dataKey="month" stroke="#8b949e" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#8b949e" tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 6 }}
                      labelStyle={{ color: '#e6edf3' }}
                      formatter={(value: any) => [Number(value)?.toLocaleString('pl-PL') + ' zł', 'Śr. cena']}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="Śr. cena" stroke="#58a6ff" strokeWidth={2} dot={{ fill: '#58a6ff', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Mileage trend */}
              <div className="chart-container">
                <div className="chart-title">Zmiana średniego przebiegu w czasie</div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                    <XAxis dataKey="month" stroke="#8b949e" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#8b949e" tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 6 }}
                      labelStyle={{ color: '#e6edf3' }}
                      formatter={(value: any) => [Number(value)?.toLocaleString('pl-PL') + ' km', 'Śr. przebieg']}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="Śr. przebieg" stroke="#d29922" strokeWidth={2} dot={{ fill: '#d29922', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Accident-free rate */}
              <div className="chart-container">
                <div className="chart-title">Zmiana wskaźnika bezwypadkowości w czasie</div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                    <XAxis dataKey="month" stroke="#8b949e" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#8b949e" tick={{ fontSize: 12 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 6 }}
                      labelStyle={{ color: '#e6edf3' }}
                      formatter={(value: any) => [`${Number(value)?.toFixed(1)}%`, 'Bezwypadkowość']}
                    />
                    <Legend />
                    <Bar dataKey="Bezwypadkowość (%)" fill="#3fb950" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
