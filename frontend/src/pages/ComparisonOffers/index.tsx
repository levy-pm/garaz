import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { ComparisonOffer, TargetCar, comparisonOffersApi, targetCarsApi } from '../../api';
import FormField from '../../components/FormField';

export default function ComparisonOffersPage() {
  const [offers, setOffers] = useState<ComparisonOffer[]>([]);
  const [cars, setCars] = useState<TargetCar[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Partial<ComparisonOffer>>();

  const load = useCallback(async () => {
    const [o, c] = await Promise.all([comparisonOffersApi.getAll(), targetCarsApi.getAll()]);
    setOffers(o);
    setCars(c);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onSubmit = async (data: Partial<ComparisonOffer>) => {
    if (data.targetCarId) data.targetCarId = Number(data.targetCarId);
    if (editId) {
      await comparisonOffersApi.update(editId, data);
    } else {
      await comparisonOffersApi.create(data);
    }
    reset();
    setEditId(null);
    load();
  };

  const startEdit = (offer: ComparisonOffer) => {
    setEditId(offer.id);
    reset(offer);
  };

  return (
    <div>
      <h1>Oferty porownawcze</h1>

      <div style={{ background: '#fff', padding: 20, borderRadius: 8, marginBottom: 24 }}>
        <h3>{editId ? 'Edytuj oferte' : 'Dodaj nowa oferte'}</h3>
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 14 }}>
              Auto docelowe <span style={{ color: '#e94560' }}>*</span>
            </label>
            <select {...register('targetCarId', { required: 'Wybierz auto' })} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}>
              <option value="">-- wybierz --</option>
              {cars.map(c => <option key={c.id} value={c.id}>{c.make} {c.model} ({c.year})</option>)}
            </select>
            {errors.targetCarId && <span style={{ color: '#e94560', fontSize: 12 }}>{errors.targetCarId.message}</span>}
          </div>
          <FormField label="Zrodlo" name="source" register={register} errors={errors} required placeholder="np. OtoMoto, mobile.de" />
          <FormField label="Cena" name="price" type="number" step="100" register={register} errors={errors} required />
          <FormField label="URL oferty" name="sourceUrl" register={register} errors={errors} placeholder="https://..." />
          <FormField label="Przebieg (km)" name="mileage" type="number" register={register} errors={errors} />
          <FormField label="Rok produkcji" name="year" type="number" register={register} errors={errors} />
          <FormField label="Stan" name="condition" register={register} errors={errors} placeholder="np. dobry, uszkodzony" />
          <FormField label="Lokalizacja" name="location" register={register} errors={errors} />
          <FormField label="Waluta" name="currency" register={register} errors={errors} placeholder="PLN" />
          <div style={{ gridColumn: '1 / -1' }}>
            <FormField label="Notatki" name="notes" type="textarea" register={register} errors={errors} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit" style={btnStyle}>{editId ? 'Zapisz zmiany' : 'Dodaj oferte'}</button>
            {editId && <button type="button" onClick={() => { setEditId(null); reset(); }} style={{ ...btnStyle, background: '#666', marginLeft: 8 }}>Anuluj</button>}
          </div>
        </form>
      </div>

      <div style={{ background: '#fff', padding: 20, borderRadius: 8 }}>
        <h3>Lista ofert ({offers.length})</h3>
        {offers.length === 0 ? <p style={{ color: '#999' }}>Brak ofert.</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                <th style={thStyle}>Auto</th>
                <th style={thStyle}>Zrodlo</th>
                <th style={thStyle}>Cena</th>
                <th style={thStyle}>Przebieg</th>
                <th style={thStyle}>Lokalizacja</th>
                <th style={thStyle}>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {offers.map(o => (
                <tr key={o.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={tdStyle}>{o.targetCar ? `${o.targetCar.make} ${o.targetCar.model}` : '-'}</td>
                  <td style={tdStyle}>{o.sourceUrl ? <a href={o.sourceUrl} target="_blank" rel="noreferrer">{o.source}</a> : o.source}</td>
                  <td style={tdStyle}>{o.price.toLocaleString()} {o.currency}</td>
                  <td style={tdStyle}>{o.mileage ? `${o.mileage.toLocaleString()} km` : '-'}</td>
                  <td style={tdStyle}>{o.location || '-'}</td>
                  <td style={tdStyle}>
                    <button onClick={() => startEdit(o)} style={smallBtn}>Edytuj</button>
                    <button onClick={() => { comparisonOffersApi.remove(o.id).then(load); }} style={{ ...smallBtn, background: '#e94560', marginLeft: 4 }}>Archiwizuj</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = { padding: '10px 24px', background: '#e94560', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14 };
const smallBtn: React.CSSProperties = { padding: '4px 12px', background: '#333', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 };
const thStyle: React.CSSProperties = { padding: '8px 12px' };
const tdStyle: React.CSSProperties = { padding: '8px 12px' };
