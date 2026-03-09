import { useEffect, useState, useCallback } from 'react';
import { marketOffersApi, type MarketOffer } from '../../api';
import VehicleForm from '../../components/VehicleForm';
import Pagination from '../../components/Pagination';

const fmtPrice = (v: number) => v.toLocaleString('pl-PL') + ' zł';
const fmtKm = (v: number) => v.toLocaleString('pl-PL') + ' km';

export default function MarketOffersPage() {
  const [offers, setOffers] = useState<MarketOffer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saveError, setSaveError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await marketOffersApi.getAll({ page, limit, search, sortBy, sortOrder: 'desc' });
      setOffers(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, sortBy]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (data: any) => {
    setSaveError('');
    try {
      await marketOffersApi.create(data);
      setShowModal(false);
      load();
    } catch (err: any) {
      setSaveError(err.response?.data?.error || 'Błąd zapisu oferty');
    }
  };

  const handleUpdate = async (id: number, data: any) => {
    setSaveError('');
    try {
      await marketOffersApi.update(id, data);
      setEditingId(null);
      load();
    } catch (err: any) {
      setSaveError(err.response?.data?.error || 'Błąd aktualizacji oferty');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Czy na pewno chcesz usunąć tę ofertę?')) return;
    try {
      await marketOffersApi.remove(id);
      load();
    } catch (err: any) {
      setSaveError(err.response?.data?.error || 'Błąd usuwania oferty');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Oferty rynkowe</h1>
        <button className="btn btn-primary" onClick={() => { setShowModal(true); }}>
          + Dodaj ofertę
        </button>
      </div>

      {saveError && (
        <div style={{ background: 'var(--red-bg)', color: 'var(--red)', padding: '10px 16px', borderRadius: 'var(--radius)', marginBottom: 16, fontSize: 14 }}>
          {saveError}
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
      ) : offers.length === 0 ? (
        <div className="empty-state">
          <p>Brak ofert rynkowych. Kliknij "Dodaj ofertę" aby dodać pierwszą.</p>
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
                <th>Bezwypadkowy</th>
                <th>Link</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {offers.map(o => (
                <>
                  <tr key={o.id}>
                    <td style={{ fontWeight: 600 }}>{o.make}</td>
                    <td>{o.model}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{o.year}</td>
                    <td>{o.vehicleType === 'Motocykl' ? 'N/D' : (o.transmission || '—')}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{o.mileageKm != null ? fmtKm(o.mileageKm) : '—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{o.pricePLN != null ? fmtPrice(o.pricePLN) : '—'}</td>
                    <td>
                      <span className={`badge ${o.accidentFree ? 'badge-green' : 'badge-red'}`}>
                        {o.accidentFree ? 'Tak' : 'Nie'}
                      </span>
                    </td>
                    <td>
                      {o.offerUrl ? (
                        <a href={o.offerUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13 }}>Link</a>
                      ) : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-sm" onClick={() => {
                          setEditingId(editingId === o.id ? null : o.id);
                        }}>
                          {editingId === o.id ? 'Zamknij' : 'Edytuj'}
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(o.id)}>Usuń</button>
                      </div>
                    </td>
                  </tr>
                  {editingId === o.id && (
                    <tr key={`edit-${o.id}`} className="inline-edit-panel">
                      <td colSpan={9}>
                        <VehicleForm
                          defaultValues={o as any}
                          onSubmit={(data) => handleUpdate(o.id, data)}
                          onCancel={() => { setEditingId(null); }}
                          showOfferFields
                          submitLabel="Zapisz zmiany"
                        />
                      </td>
                    </tr>
                  )}
                </>
              ))}
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

      {/* Add modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal" style={{ maxWidth: 800 }}>
            <div className="modal-header">
              <h3 className="modal-title">Nowa oferta rynkowa</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)} style={{ fontSize: 18 }}>✕</button>
            </div>
            <div className="modal-body">
              <VehicleForm
                onSubmit={handleCreate}
                onCancel={() => setShowModal(false)}
                showOfferFields
                submitLabel="Dodaj ofertę"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
