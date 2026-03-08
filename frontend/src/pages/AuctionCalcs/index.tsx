import { useState, useEffect, useCallback } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { auctionCalcsApi, targetCarsApi, costProfilesApi } from '../../api';
import type { AuctionCalc, TargetCar, CostProfile } from '../../api';
import FormField from '../../components/FormField';

export default function AuctionCalcsPage() {
  const [calcs, setCalcs] = useState<AuctionCalc[]>([]);
  const [cars, setCars] = useState<TargetCar[]>([]);
  const [profiles, setProfiles] = useState<CostProfile[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<Partial<AuctionCalc>>();

  const maxBid = useWatch({ control, name: 'maxBid', defaultValue: 0 }) || 0;
  const auctionFee = useWatch({ control, name: 'auctionFee', defaultValue: 0 }) || 0;
  const buyerPremium = useWatch({ control, name: 'buyerPremium', defaultValue: 0 }) || 0;
  const transportCost = useWatch({ control, name: 'transportCost', defaultValue: 0 }) || 0;
  const repairEstimate = useWatch({ control, name: 'repairEstimate', defaultValue: 0 }) || 0;
  const otherCosts = useWatch({ control, name: 'otherCosts', defaultValue: 0 }) || 0;
  const estimatedValue = useWatch({ control, name: 'estimatedValue', defaultValue: 0 }) || 0;

  const totalCost = maxBid + auctionFee + buyerPremium + transportCost + repairEstimate + otherCosts;
  const potentialProfit = estimatedValue - totalCost;

  const load = useCallback(async () => {
    const [a, c, p] = await Promise.all([auctionCalcsApi.getAll(), targetCarsApi.getAll(), costProfilesApi.getAll()]);
    setCalcs(a);
    setCars(c);
    setProfiles(p);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onSubmit = async (data: Partial<AuctionCalc>) => {
    if (data.targetCarId) data.targetCarId = Number(data.targetCarId) || undefined;
    if (data.costProfileId) data.costProfileId = Number(data.costProfileId) || undefined;
    if (editId) {
      await auctionCalcsApi.update(editId, data);
    } else {
      await auctionCalcsApi.create(data);
    }
    reset();
    setEditId(null);
    load();
  };

  return (
    <div>
      <h1>Kalkulacje licytacji</h1>

      <div style={{ background: '#fff', padding: 20, borderRadius: 8, marginBottom: 24 }}>
        <h3>{editId ? 'Edytuj kalkulacje' : 'Nowa kalkulacja licytacji'}</h3>
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <FormField label="Nazwa kalkulacji" name="name" register={register} errors={errors} required />
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 14 }}>Auto docelowe</label>
            <select {...register('targetCarId')} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}>
              <option value="">-- opcjonalne --</option>
              {cars.map(c => <option key={c.id} value={c.id}>{c.make} {c.model} ({c.year})</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 14 }}>Profil kosztowy</label>
            <select {...register('costProfileId')} style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}>
              <option value="">-- opcjonalne --</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <FormField label="Cena wywolawcza" name="startingPrice" type="number" step="100" register={register} errors={errors} required />
          <FormField label="Maks. oferta" name="maxBid" type="number" step="100" register={register} errors={errors} required />
          <FormField label="Oplata aukcyjna" name="auctionFee" type="number" step="100" register={register} errors={errors} />
          <FormField label="Premia kupujacego" name="buyerPremium" type="number" step="100" register={register} errors={errors} />
          <FormField label="Koszt transportu" name="transportCost" type="number" step="100" register={register} errors={errors} />
          <FormField label="Szacunek naprawy" name="repairEstimate" type="number" step="100" register={register} errors={errors} />
          <FormField label="Inne koszty" name="otherCosts" type="number" step="100" register={register} errors={errors} />
          <FormField label="Szacowana wartosc" name="estimatedValue" type="number" step="100" register={register} errors={errors} />

          <div style={{ gridColumn: '1 / -1', background: '#f0f0f0', padding: 16, borderRadius: 8 }}>
            <strong>Suma kosztow: {totalCost.toLocaleString()} PLN</strong> &nbsp;|&nbsp;
            <strong style={{ color: potentialProfit >= 0 ? '#2ecc71' : '#e94560' }}>Potencjalny zysk: {potentialProfit.toLocaleString()} PLN</strong>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <FormField label="Notatki" name="notes" type="textarea" register={register} errors={errors} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit" style={btnStyle}>{editId ? 'Zapisz zmiany' : 'Dodaj kalkulacje'}</button>
            {editId && <button type="button" onClick={() => { setEditId(null); reset(); }} style={{ ...btnStyle, background: '#666', marginLeft: 8 }}>Anuluj</button>}
          </div>
        </form>
      </div>

      <div style={{ background: '#fff', padding: 20, borderRadius: 8 }}>
        <h3>Lista kalkulacji ({calcs.length})</h3>
        {calcs.length === 0 ? <p style={{ color: '#999' }}>Brak kalkulacji licytacji.</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                <th style={thStyle}>Nazwa</th>
                <th style={thStyle}>Auto</th>
                <th style={thStyle}>Maks. oferta</th>
                <th style={thStyle}>Suma kosztow</th>
                <th style={thStyle}>Zysk</th>
                <th style={thStyle}>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {calcs.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={tdStyle}>{c.name}</td>
                  <td style={tdStyle}>{c.targetCar ? `${c.targetCar.make} ${c.targetCar.model}` : '-'}</td>
                  <td style={tdStyle}>{c.maxBid.toLocaleString()} PLN</td>
                  <td style={tdStyle}>{c.totalCost.toLocaleString()} PLN</td>
                  <td style={{ ...tdStyle, color: c.potentialProfit >= 0 ? '#2ecc71' : '#e94560', fontWeight: 700 }}>{c.potentialProfit.toLocaleString()} PLN</td>
                  <td style={tdStyle}>
                    <button onClick={() => { setEditId(c.id); reset(c); }} style={smallBtn}>Edytuj</button>
                    <button onClick={() => { auctionCalcsApi.remove(c.id).then(load); }} style={{ ...smallBtn, background: '#e94560', marginLeft: 4 }}>Archiwizuj</button>
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
