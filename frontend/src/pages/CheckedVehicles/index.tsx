import { useEffect, useState, useCallback } from 'react';
import { checkedVehiclesApi, marketStatsApi, profitabilityApi, type CheckedVehicle, type MarketStats, type ProfitabilityResult } from '../../api';
import VehicleForm from '../../components/VehicleForm';
import ComparisonIndicator from '../../components/ComparisonIndicator';
import Pagination from '../../components/Pagination';

const fmtPrice = (v: number) => v.toLocaleString('pl-PL') + ' zł';
const fmtKm = (v: number) => v.toLocaleString('pl-PL') + ' km';

export default function CheckedVehiclesPage() {
  const [vehicles, setVehicles] = useState<CheckedVehicle[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [marketStats, setMarketStats] = useState<Record<number, MarketStats>>({});

  // Profitability state
  const [profitVehicleId, setProfitVehicleId] = useState<number | null>(null);
  const [profitResult, setProfitResult] = useState<ProfitabilityResult | null>(null);
  const [profitForm, setProfitForm] = useState({ type: 'purchase', purchasePrice: '', isImport: false });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await checkedVehiclesApi.getAll({ page, limit, search, sortBy, sortOrder: 'desc' });
      setVehicles(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);

      // Load market stats for each vehicle
      const stats: Record<number, MarketStats> = {};
      await Promise.all(res.items.map(async (v) => {
        try {
          stats[v.id] = await marketStatsApi.getForVehicle(v.id);
        } catch { /* no stats */ }
      }));
      setMarketStats(stats);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, sortBy]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (data: any) => {
    await checkedVehiclesApi.create(data);
    setShowAddForm(false);
    load();
  };

  const handleUpdate = async (id: number, data: any) => {
    await checkedVehiclesApi.update(id, data);
    setEditingId(null);
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Czy na pewno chcesz usunąć ten pojazd?')) return;
    await checkedVehiclesApi.remove(id);
    load();
  };

  const handleCalcProfit = async (vehicleId: number) => {
    if (!profitForm.purchasePrice) return;
    try {
      const result = await profitabilityApi.calculate({
        vehicleId,
        type: profitForm.type,
        purchasePrice: Number(profitForm.purchasePrice),
        purchaseCurrency: 'PLN',
        isImport: profitForm.isImport,
      });
      setProfitResult(result);
    } catch { /* error */ }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Sprawdzane pojazdy</h1>
        <button className="btn btn-primary" onClick={() => { setShowAddForm(!showAddForm); setEditingId(null); }}>
          {showAddForm ? 'Zamknij formularz' : '+ Dodaj pojazd'}
        </button>
      </div>

      {showAddForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>Nowy pojazd</h3>
          <VehicleForm onSubmit={handleCreate} onCancel={() => setShowAddForm(false)} />
        </div>
      )}

      <div className="toolbar">
        <input
          className="search-input"
          placeholder="Szukaj marki, modelu..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
        <select className="sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="createdAt">Najnowsze</option>
          <option value="make">Marka</option>
          <option value="model">Model</option>
          <option value="year">Rok</option>
          <option value="pricePLN">Cena</option>
        </select>
      </div>

      {loading ? (
        <div className="loading">Ładowanie...</div>
      ) : vehicles.length === 0 ? (
        <div className="empty-state">
          <p>Brak pojazdów. Kliknij "Dodaj pojazd" aby dodać pierwszy.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Marka</th>
                <th>Model</th>
                <th>Rok</th>
                <th>Skrzynia</th>
                <th>Przebieg</th>
                <th>Cena</th>
                <th>Śr. przebieg</th>
                <th>Śr. cena</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map(v => {
                const stats = marketStats[v.id];
                return (
                  <VehicleRow
                    key={v.id}
                    vehicle={v}
                    stats={stats}
                    isEditing={editingId === v.id}
                    onEdit={() => setEditingId(editingId === v.id ? null : v.id)}
                    onSave={(data) => handleUpdate(v.id, data)}
                    onCancelEdit={() => setEditingId(null)}
                    onDelete={() => handleDelete(v.id)}
                    onCalcProfit={() => {
                      setProfitVehicleId(profitVehicleId === v.id ? null : v.id);
                      setProfitResult(null);
                      setProfitForm({ type: 'purchase', purchasePrice: String(v.pricePLN || ''), isImport: false });
                    }}
                    showProfit={profitVehicleId === v.id}
                    profitResult={profitResult}
                    profitForm={profitForm}
                    setProfitForm={setProfitForm}
                    onRunCalc={() => handleCalcProfit(v.id)}
                  />
                );
              })}
            </tbody>
          </table>
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(l) => { setLimit(l); setPage(1); }}
          />
        </div>
      )}
    </div>
  );
}

interface VehicleRowProps {
  vehicle: CheckedVehicle;
  stats?: MarketStats;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (data: any) => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onCalcProfit: () => void;
  showProfit: boolean;
  profitResult: ProfitabilityResult | null;
  profitForm: { type: string; purchasePrice: string; isImport: boolean };
  setProfitForm: (f: any) => void;
  onRunCalc: () => void;
}

function VehicleRow({ vehicle: v, stats, isEditing, onEdit, onSave, onCancelEdit, onDelete, onCalcProfit, showProfit, profitResult, profitForm, setProfitForm, onRunCalc }: VehicleRowProps) {
  return (
    <>
      <tr>
        <td style={{ fontWeight: 600 }}>{v.make}</td>
        <td>{v.model}</td>
        <td style={{ fontFamily: 'var(--font-mono)' }}>{v.year}</td>
        <td>{v.vehicleType === 'Motocykl' ? 'N/D' : (v.transmission || '—')}</td>
        <td>
          <ComparisonIndicator
            value={v.mileageKm}
            marketAvg={stats?.yearStats.avgMileage}
            format={fmtKm}
          />
        </td>
        <td>
          <ComparisonIndicator
            value={v.pricePLN}
            marketAvg={stats?.yearStats.avgPrice}
            format={fmtPrice}
          />
        </td>
        <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
          {stats?.yearStats.avgMileage != null ? fmtKm(Math.round(stats.yearStats.avgMileage)) : '—'}
        </td>
        <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
          {stats?.yearStats.avgPrice != null ? fmtPrice(Math.round(stats.yearStats.avgPrice)) : '—'}
        </td>
        <td>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-sm" onClick={onEdit}>{isEditing ? 'Zamknij' : 'Edytuj'}</button>
            <button className="btn btn-sm" onClick={onCalcProfit} title="Kalkulacja opłacalności">Kalk.</button>
            <button className="btn btn-sm btn-danger" onClick={onDelete}>Usuń</button>
          </div>
        </td>
      </tr>
      {isEditing && (
        <tr className="inline-edit-panel">
          <td colSpan={9}>
            <VehicleForm
              defaultValues={v as any}
              onSubmit={onSave}
              onCancel={onCancelEdit}
              submitLabel="Zapisz zmiany"
            />
          </td>
        </tr>
      )}
      {showProfit && (
        <tr className="inline-edit-panel">
          <td colSpan={9}>
            <h4 style={{ marginBottom: 12 }}>Kalkulacja opłacalności</h4>
            <div className="form-row" style={{ marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label">Typ transakcji</label>
                <select className="form-select" value={profitForm.type} onChange={e => setProfitForm({ ...profitForm, type: e.target.value })}>
                  <option value="purchase">Zakup</option>
                  <option value="auction">Licytacja</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Cena zakupu / licytacji (PLN)</label>
                <input className="form-input" type="number" value={profitForm.purchasePrice} onChange={e => setProfitForm({ ...profitForm, purchasePrice: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Import zza granicy</label>
                <select className="form-select" value={profitForm.isImport ? 'true' : 'false'} onChange={e => setProfitForm({ ...profitForm, isImport: e.target.value === 'true' })}>
                  <option value="false">Nie</option>
                  <option value="true">Tak</option>
                </select>
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button className="btn btn-primary" onClick={onRunCalc}>Oblicz</button>
              </div>
            </div>

            {profitResult && (
              <div className="profit-panel">
                <div className="profit-row">
                  <span className="label">Średnia cena rynkowa</span>
                  <span className="value">{fmtPrice(profitResult.avgMarketPrice)}</span>
                </div>
                <div className="profit-row">
                  <span className="label">Cena zakupu</span>
                  <span className="value">{fmtPrice(profitResult.purchasePrice)}</span>
                </div>
                {Object.entries(profitResult.breakdown).filter(([k]) => k !== 'basePricePLN').map(([key, val]) => (
                  <div className="profit-row" key={key}>
                    <span className="label">{costLabels[key] || key}</span>
                    <span className="value">{fmtPrice(val)}</span>
                  </div>
                ))}
                <div className="profit-row">
                  <span className="label">Łączne koszty</span>
                  <span className="value">{fmtPrice(profitResult.totalCosts)}</span>
                </div>
                <div className="profit-row profit-total">
                  <span className="label" style={{ fontWeight: 700 }}>
                    Maks. cena {profitResult.type === 'auction' ? 'licytacji' : 'zakupu'}
                  </span>
                  <span className="value" style={{ color: 'var(--accent)', fontSize: 20 }}>
                    {fmtPrice(profitResult.maxBuyPrice)}
                  </span>
                </div>
                <div className="profit-row">
                  <span className="label">Szacowany zysk</span>
                  <span className="value" style={{ color: profitResult.profitable ? 'var(--green)' : 'var(--red)' }}>
                    {profitResult.estimatedProfit > 0 ? '+' : ''}{fmtPrice(profitResult.estimatedProfit)}
                  </span>
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

const costLabels: Record<string, string> = {
  customsDuty: 'Cło',
  exciseDuty: 'Akcyza',
  vat: 'VAT',
  transportCost: 'Transport',
  registrationCost: 'Rejestracja',
  expertCost: 'Rzeczoznawca',
  repairCost: 'Naprawy',
  incomeTax: 'Podatek dochodowy',
  desiredMargin: 'Pożądana marża',
};
