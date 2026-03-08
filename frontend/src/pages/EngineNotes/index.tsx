import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { engineNotesApi } from '../../api';
import type { EngineNote } from '../../api';
import FormField from '../../components/FormField';

export default function EngineNotesPage() {
  const [notes, setNotes] = useState<EngineNote[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Partial<EngineNote>>();

  const load = useCallback(async () => {
    setNotes(await engineNotesApi.getAll());
  }, []);

  useEffect(() => { load(); }, [load]);

  const onSubmit = async (data: Partial<EngineNote>) => {
    if (editId) {
      await engineNotesApi.update(editId, data);
    } else {
      await engineNotesApi.create(data);
    }
    reset();
    setEditId(null);
    load();
  };

  const startEdit = (note: EngineNote) => {
    setEditId(note.id);
    reset(note);
  };

  return (
    <div>
      <h1>Notatki o silnikach</h1>

      <div style={{ background: '#fff', padding: 20, borderRadius: 8, marginBottom: 24 }}>
        <h3>{editId ? 'Edytuj notatke' : 'Dodaj notatke o silniku'}</h3>
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <FormField label="Kod silnika" name="engineCode" register={register} errors={errors} required placeholder="np. N47D20" />
          <FormField label="Rodzina silnika" name="engineFamily" register={register} errors={errors} placeholder="np. BMW N47" />
          <FormField label="Paliwo" name="fuelType" register={register} errors={errors} placeholder="benzyna / diesel" />
          <FormField label="Pojemnosc (l)" name="displacement" type="number" step="0.1" register={register} errors={errors} />
          <FormField label="Moc (KM)" name="horsepower" type="number" register={register} errors={errors} />
          <FormField label="Moment (Nm)" name="torque" type="number" register={register} errors={errors} />
          <FormField label="Niezawodnosc (1-10)" name="reliability" type="number" register={register} errors={errors} />
          <div style={{ gridColumn: '1 / -1' }}>
            <FormField label="Znane problemy" name="knownIssues" type="textarea" register={register} errors={errors} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <FormField label="Serwis / utrzymanie" name="maintenance" type="textarea" register={register} errors={errors} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <FormField label="Notatki" name="notes" type="textarea" register={register} errors={errors} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit" style={btnStyle}>{editId ? 'Zapisz zmiany' : 'Dodaj notatke'}</button>
            {editId && <button type="button" onClick={() => { setEditId(null); reset(); }} style={{ ...btnStyle, background: '#666', marginLeft: 8 }}>Anuluj</button>}
          </div>
        </form>
      </div>

      <div style={{ background: '#fff', padding: 20, borderRadius: 8 }}>
        <h3>Lista silnikow ({notes.length})</h3>
        {notes.length === 0 ? <p style={{ color: '#999' }}>Brak notatek o silnikach.</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                <th style={thStyle}>Kod</th>
                <th style={thStyle}>Rodzina</th>
                <th style={thStyle}>Paliwo</th>
                <th style={thStyle}>Moc</th>
                <th style={thStyle}>Niezawodnosc</th>
                <th style={thStyle}>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {notes.map(n => (
                <tr key={n.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={tdStyle}><strong>{n.engineCode}</strong></td>
                  <td style={tdStyle}>{n.engineFamily || '-'}</td>
                  <td style={tdStyle}>{n.fuelType || '-'}</td>
                  <td style={tdStyle}>{n.horsepower ? `${n.horsepower} KM` : '-'}</td>
                  <td style={tdStyle}>{n.reliability ? `${n.reliability}/10` : '-'}</td>
                  <td style={tdStyle}>
                    <button onClick={() => startEdit(n)} style={smallBtn}>Edytuj</button>
                    <button onClick={() => { engineNotesApi.remove(n.id).then(load); }} style={{ ...smallBtn, background: '#e94560', marginLeft: 4 }}>Archiwizuj</button>
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
