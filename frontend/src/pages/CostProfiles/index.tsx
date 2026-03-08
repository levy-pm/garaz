import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { costProfilesApi } from '../../api';
import type { CostProfile } from '../../api';
import FormField from '../../components/FormField';

export default function CostProfilesPage() {
  const [profiles, setProfiles] = useState<CostProfile[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Partial<CostProfile>>();

  const load = useCallback(async () => {
    setProfiles(await costProfilesApi.getAll());
  }, []);

  useEffect(() => { load(); }, [load]);

  const onSubmit = async (data: Partial<CostProfile>) => {
    if (editId) {
      await costProfilesApi.update(editId, data);
    } else {
      await costProfilesApi.create(data);
    }
    reset();
    setEditId(null);
    load();
  };

  const startEdit = (profile: CostProfile) => {
    setEditId(profile.id);
    reset(profile);
  };

  return (
    <div>
      <h1>Profile kosztowe</h1>

      <div style={{ background: '#fff', padding: 20, borderRadius: 8, marginBottom: 24 }}>
        <h3>{editId ? 'Edytuj profil' : 'Dodaj profil kosztowy'}</h3>
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <FormField label="Nazwa profilu" name="name" register={register} errors={errors} required />
          <FormField label="Waluta" name="currency" register={register} errors={errors} placeholder="PLN" />
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 14 }}>Domyslny profil</label>
            <input type="checkbox" {...register('isDefault')} /> Ustaw jako domyslny
          </div>
          <FormField label="Stawka naprawy (PLN/h)" name="defaultRepairRate" type="number" step="10" register={register} errors={errors} />
          <FormField label="Stawka lakierowania (PLN/h)" name="defaultPaintRate" type="number" step="10" register={register} errors={errors} />
          <FormField label="Domyslny transport" name="defaultTransport" type="number" step="100" register={register} errors={errors} />
          <FormField label="Domyslna oplata aukcyjna" name="defaultAuctionFee" type="number" step="100" register={register} errors={errors} />
          <FormField label="Domyslna premia kupujacego" name="defaultBuyerPremium" type="number" step="100" register={register} errors={errors} />
          <FormField label="Stawka podatkowa (%)" name="taxRate" type="number" step="0.1" register={register} errors={errors} />
          <FormField label="Docelowa marza (%)" name="marginTarget" type="number" step="0.1" register={register} errors={errors} />
          <div style={{ gridColumn: '1 / -1' }}>
            <FormField label="Notatki" name="notes" type="textarea" register={register} errors={errors} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit" style={btnStyle}>{editId ? 'Zapisz zmiany' : 'Dodaj profil'}</button>
            {editId && <button type="button" onClick={() => { setEditId(null); reset(); }} style={{ ...btnStyle, background: '#666', marginLeft: 8 }}>Anuluj</button>}
          </div>
        </form>
      </div>

      <div style={{ background: '#fff', padding: 20, borderRadius: 8 }}>
        <h3>Lista profili ({profiles.length})</h3>
        {profiles.length === 0 ? <p style={{ color: '#999' }}>Brak profili kosztowych.</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                <th style={thStyle}>Nazwa</th>
                <th style={thStyle}>Waluta</th>
                <th style={thStyle}>Stawka naprawy</th>
                <th style={thStyle}>Transport</th>
                <th style={thStyle}>Podatek</th>
                <th style={thStyle}>Domyslny</th>
                <th style={thStyle}>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={tdStyle}><strong>{p.name}</strong></td>
                  <td style={tdStyle}>{p.currency}</td>
                  <td style={tdStyle}>{p.defaultRepairRate} PLN/h</td>
                  <td style={tdStyle}>{p.defaultTransport.toLocaleString()} PLN</td>
                  <td style={tdStyle}>{p.taxRate}%</td>
                  <td style={tdStyle}>{p.isDefault ? 'Tak' : '-'}</td>
                  <td style={tdStyle}>
                    <button onClick={() => startEdit(p)} style={smallBtn}>Edytuj</button>
                    <button onClick={() => { costProfilesApi.remove(p.id).then(load); }} style={{ ...smallBtn, background: '#e94560', marginLeft: 4 }}>Archiwizuj</button>
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
