import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { targetCarsApi } from '../../api';
import type { TargetCar } from '../../api';
import FormField from '../../components/FormField';

export default function TargetCarsPage() {
  const [cars, setCars] = useState<TargetCar[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Partial<TargetCar>>();

  const load = useCallback(async () => {
    setCars(await targetCarsApi.getAll());
  }, []);

  useEffect(() => { load(); }, [load]);

  const onSubmit = async (data: Partial<TargetCar>) => {
    if (editId) {
      await targetCarsApi.update(editId, data);
    } else {
      await targetCarsApi.create(data);
    }
    reset();
    setEditId(null);
    load();
  };

  const startEdit = (car: TargetCar) => {
    setEditId(car.id);
    reset(car);
  };

  const archive = async (id: number) => {
    await targetCarsApi.remove(id);
    load();
  };

  return (
    <div>
      <h1>Auta docelowe</h1>

      <div style={{ background: '#fff', padding: 20, borderRadius: 8, marginBottom: 24 }}>
        <h3>{editId ? 'Edytuj auto' : 'Dodaj nowe auto'}</h3>
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <FormField label="Marka" name="make" register={register} errors={errors} required />
          <FormField label="Model" name="model" register={register} errors={errors} required />
          <FormField label="Rok" name="year" type="number" register={register} errors={errors} required />
          <FormField label="Nadwozie" name="bodyType" register={register} errors={errors} placeholder="np. sedan, kombi" />
          <FormField label="Paliwo" name="fuelType" register={register} errors={errors} placeholder="np. benzyna, diesel" />
          <FormField label="Pojemność silnika" name="engineCapacity" type="number" step="0.1" register={register} errors={errors} />
          <FormField label="Moc (KM)" name="horsepower" type="number" register={register} errors={errors} />
          <FormField label="Skrzynia biegów" name="transmission" register={register} errors={errors} placeholder="manualna / automat" />
          <FormField label="Kolor" name="color" register={register} errors={errors} />
          <FormField label="Maks. budżet" name="maxBudget" type="number" step="100" register={register} errors={errors} />
          <div style={{ gridColumn: '1 / -1' }}>
            <FormField label="Notatki" name="notes" type="textarea" register={register} errors={errors} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit" style={btnStyle}>{editId ? 'Zapisz zmiany' : 'Dodaj auto'}</button>
            {editId && <button type="button" onClick={() => { setEditId(null); reset(); }} style={{ ...btnStyle, background: '#666', marginLeft: 8 }}>Anuluj</button>}
          </div>
        </form>
      </div>

      <div style={{ background: '#fff', padding: 20, borderRadius: 8 }}>
        <h3>Lista aut ({cars.length})</h3>
        {cars.length === 0 ? <p style={{ color: '#999' }}>Brak aut docelowych. Dodaj pierwsze powyżej.</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                <th style={thStyle}>Marka</th>
                <th style={thStyle}>Model</th>
                <th style={thStyle}>Rok</th>
                <th style={thStyle}>Paliwo</th>
                <th style={thStyle}>Budżet</th>
                <th style={thStyle}>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {cars.map(car => (
                <tr key={car.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={tdStyle}>{car.make}</td>
                  <td style={tdStyle}>{car.model}</td>
                  <td style={tdStyle}>{car.year}</td>
                  <td style={tdStyle}>{car.fuelType || '-'}</td>
                  <td style={tdStyle}>{car.maxBudget ? `${car.maxBudget.toLocaleString()} PLN` : '-'}</td>
                  <td style={tdStyle}>
                    <button onClick={() => startEdit(car)} style={smallBtn}>Edytuj</button>
                    <button onClick={() => archive(car.id)} style={{ ...smallBtn, background: '#e94560', marginLeft: 4 }}>Archiwizuj</button>
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
