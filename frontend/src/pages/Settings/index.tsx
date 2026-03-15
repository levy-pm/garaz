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

      {/* Exchange rates */}
      <div className="card">
        <h3 style={{ fontSize: 16, marginBottom: 16 }}>Kursy walut</h3>
        <div className="form-row">
          <SettingsField label="Kurs EUR/PLN" value={settings.exchangeRateEUR} onChange={v => handleChange('exchangeRateEUR', v)} step="0.01" />
          <SettingsField label="Kurs USD/PLN" value={settings.exchangeRateUSD} onChange={v => handleChange('exchangeRateUSD', v)} step="0.01" />
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, marginBottom: 0 }}>
          Kursy walut ustawiane ręcznie. Docelowo możliwa integracja z API NBP.
        </p>
      </div>

      {/* ROI */}
      <div className="card">
        <h3 style={{ fontSize: 16, marginBottom: 16 }}>Opłacalność</h3>
        <div className="form-row">
          <SettingsField label="Pożądany ROI (%)" value={settings.desiredROI} onChange={v => handleChange('desiredROI', v)} />
          <SettingsField label="Pożądana marża (PLN)" value={settings.desiredMargin} onChange={v => handleChange('desiredMargin', v)} />
          <SettingsField label="Redukcja za wypadek (%)" value={settings.accidentDiscountPercent} onChange={v => handleChange('accidentDiscountPercent', v)} />
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, marginBottom: 0 }}>
          Redukcja za wypadek jest stosowana kumulacyjnie. Np. 10% × 2 wypadki = 20% redukcji proposedPrice.
        </p>
      </div>

      {/* Costs */}
      <div className="card">
        <h3 style={{ fontSize: 16, marginBottom: 16 }}>Koszty dodatkowe (wartości domyślne)</h3>
        <div className="form-row">
          <SettingsField label="Koszt transportu (PLN)" value={settings.transportCost} onChange={v => handleChange('transportCost', v)} />
          <SettingsField label="Koszt rejestracji (PLN)" value={settings.registrationCost} onChange={v => handleChange('registrationCost', v)} />
          <SettingsField label="Koszt tłumaczenia (PLN)" value={settings.translationCost} onChange={v => handleChange('translationCost', v)} />
          <SettingsField label="Koszt przeglądu (PLN)" value={settings.inspectionCost} onChange={v => handleChange('inspectionCost', v)} />
          <SettingsField label="Koszt rzeczoznawcy (PLN)" value={settings.expertCost} onChange={v => handleChange('expertCost', v)} />
          <SettingsField label="Szacowane koszty napraw (PLN)" value={settings.estimatedRepairCost} onChange={v => handleChange('estimatedRepairCost', v)} />
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

function SettingsField({ label, value, onChange, step }: { label: string; value: number; onChange: (v: string) => void; step?: string }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input
        className="form-input"
        type="number"
        step={step || '0.1'}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}
