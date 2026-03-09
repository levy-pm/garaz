import { useEffect, useState } from 'react';
import { settingsApi, type Settings } from '../../api';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    settingsApi.get().then(s => setSettings(s)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleChange = (field: keyof Settings, value: string) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: Number(value) || 0 });
    setSaved(false);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const { id, createdAt, updatedAt, ...data } = settings;
      const updated = await settingsApi.update(settings.id, data);
      setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Ładowanie ustawień...</div>;
  if (!settings) return <div className="empty-state"><p>Nie udało się załadować ustawień.</p></div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Ustawienia</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {saved && <span style={{ color: 'var(--green)', fontSize: 14 }}>Zapisano</span>}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Zapisywanie...' : 'Zapisz ustawienia'}
          </button>
        </div>
      </div>

      {/* Tax & duties */}
      <div className="card">
        <h3 style={{ fontSize: 16, marginBottom: 16 }}>Podatki i opłaty</h3>
        <div className="form-row">
          <SettingsField label="Akcyza do 2.0 l (%)" value={settings.exciseDutySmall} onChange={v => handleChange('exciseDutySmall', v)} />
          <SettingsField label="Akcyza powyżej 2.0 l (%)" value={settings.exciseDutyLarge} onChange={v => handleChange('exciseDutyLarge', v)} />
          <SettingsField label="Cło (%)" value={settings.customsDuty} onChange={v => handleChange('customsDuty', v)} />
          <SettingsField label="Podatek dochodowy (%)" value={settings.incomeTax} onChange={v => handleChange('incomeTax', v)} />
          <SettingsField label="VAT (%)" value={settings.vat} onChange={v => handleChange('vat', v)} />
        </div>
      </div>

      {/* Costs */}
      <div className="card">
        <h3 style={{ fontSize: 16, marginBottom: 16 }}>Koszty dodatkowe</h3>
        <div className="form-row">
          <SettingsField label="Szacowane koszty napraw (PLN)" value={settings.estimatedRepairCost} onChange={v => handleChange('estimatedRepairCost', v)} />
          <SettingsField label="Pożądana marża (PLN)" value={settings.desiredMargin} onChange={v => handleChange('desiredMargin', v)} />
          <SettingsField label="Koszt transportu (PLN)" value={settings.transportCost} onChange={v => handleChange('transportCost', v)} />
          <SettingsField label="Koszt rejestracji (PLN)" value={settings.registrationCost} onChange={v => handleChange('registrationCost', v)} />
          <SettingsField label="Koszt rzeczoznawcy (PLN)" value={settings.expertCost} onChange={v => handleChange('expertCost', v)} />
        </div>
      </div>

      {/* Info */}
      <div className="card" style={{ borderColor: 'rgba(88, 166, 255, 0.2)', background: 'rgba(88, 166, 255, 0.02)' }}>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
          Te wartości są wykorzystywane w kalkulacjach opłacalności zakupu i licytacji pojazdów.
          Zmiana ustawień wpływa na wszystkie przyszłe kalkulacje.
        </p>
      </div>
    </div>
  );
}

function SettingsField({ label, value, onChange }: { label: string; value: number; onChange: (v: string) => void }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input
        className="form-input"
        type="number"
        step="0.1"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}
