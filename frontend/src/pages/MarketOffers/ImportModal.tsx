import { useState, useCallback } from 'react';
import {
  importApi,
  checkedVehiclesApi,
  type CheckedVehicle,
  type ImportPreview,
  type ImportResult,
} from '../../api';
import { extractApiError } from '../../api/client';
import { useEffect } from 'react';

type Step = 'upload' | 'preview' | 'mapping' | 'importing' | 'done';

const TARGET_FIELD_LABELS: Record<string, string> = {
  vehicleType: 'Typ pojazdu',
  make: 'Marka',
  model: 'Model',
  year: 'Rok',
  version: 'Wersja',
  equipmentVersion: 'Wersja wyposażenia',
  bodyType: 'Nadwozie',
  fuelType: 'Paliwo',
  color: 'Kolor',
  transmission: 'Skrzynia',
  driveType: 'Napęd',
  engineCapacity: 'Pojemność',
  horsepowerKM: 'Moc (KM)',
  horsepowerKW: 'Moc (kW)',
  torque: 'Moment (Nm)',
  pricePLN: 'Cena PLN',
  priceEUR: 'Cena EUR',
  priceUSD: 'Cena USD',
  currency: 'Waluta',
  mileageKm: 'Przebieg (km)',
  mileageMi: 'Przebieg (mi)',
  accidentFree: 'Bezwypadkowy',
  accidentCount: 'Liczba wypadków',
  continent: 'Kontynent',
  country: 'Kraj',
  offerUrl: 'URL oferty',
  equipment: 'Wyposażenie',
  notes: 'Notatki',
};

export default function ImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [vehicles, setVehicles] = useState<CheckedVehicle[]>([]);
  const [checkedVehicleId, setCheckedVehicleId] = useState<number | undefined>();
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [targetFields, setTargetFields] = useState<string[]>([]);

  // Load vehicles and target fields
  useEffect(() => {
    checkedVehiclesApi.getAll({ limit: 1000 }).then(res => {
      setVehicles(res.items.filter(v => !v.isArchived));
    }).catch(() => {});
    importApi.targetFields().then(setTargetFields).catch(() => {});
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError(null);
    }
  }, []);

  const handlePreview = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const prev = await importApi.preview(file, checkedVehicleId);
      setPreview(prev);
      setMapping(prev.mapping);
      setStep('preview');
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, [file, checkedVehicleId]);

  const handleMappingChange = useCallback((sourceCol: string, targetField: string | null) => {
    setMapping(prev => ({ ...prev, [sourceCol]: targetField || null }));
  }, []);

  const handleImport = useCallback(async () => {
    if (!file) return;
    setStep('importing');
    setLoading(true);
    setError(null);
    try {
      const res = await importApi.commit(file, mapping, checkedVehicleId, true);
      setResult(res);
      setStep('done');
      if (res.imported > 0) onImported();
    } catch (err) {
      setError(extractApiError(err));
      setStep('mapping');
    } finally {
      setLoading(false);
    }
  }, [file, mapping, checkedVehicleId, onImported]);

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 900, maxHeight: '90vh', overflow: 'auto' }}>
        <div className="modal-header">
          <h3 className="modal-title">Import ofert rynkowych</h3>
          <button className="btn-icon" onClick={onClose} style={{ fontSize: 18 }}>✕</button>
        </div>
        <div className="modal-body">
          {error && (
            <div style={{ background: 'var(--red-bg)', color: 'var(--red)', padding: '10px 16px', borderRadius: 'var(--radius)', marginBottom: 16, fontSize: 14 }}>
              {error}
            </div>
          )}

          {/* ── Step: Upload ── */}
          {step === 'upload' && (
            <div>
              <div className="form-group">
                <label className="form-label">Przypisz do pojazdu (opcjonalnie)</label>
                <select
                  className="form-select"
                  value={checkedVehicleId ?? ''}
                  onChange={e => setCheckedVehicleId(e.target.value ? Number(e.target.value) : undefined)}
                >
                  <option value="">— Bez przypisania —</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.make} {v.model} {v.year}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Plik CSV lub Excel</label>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="form-input"
                  style={{ padding: '8px' }}
                />
              </div>

              {file && (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '8px 0' }}>
                  Wybrany plik: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}

              <button
                className="btn btn-primary"
                onClick={handlePreview}
                disabled={!file || loading}
                style={{ marginTop: 12 }}
              >
                {loading ? 'Przetwarzanie...' : 'Podgląd importu'}
              </button>
            </div>
          )}

          {/* ── Step: Preview ── */}
          {step === 'preview' && preview && (
            <div>
              <div className="stats-grid" style={{ marginBottom: 16 }}>
                <div className="stat-card">
                  <div className="stat-label">Wiersze razem</div>
                  <div className="stat-value" style={{ fontSize: 20 }}>{preview.totalRows}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Poprawne</div>
                  <div className="stat-value" style={{ fontSize: 20, color: 'var(--green)' }}>{preview.validRows}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Błędne</div>
                  <div className="stat-value" style={{ fontSize: 20, color: preview.invalidRows > 0 ? 'var(--red)' : undefined }}>{preview.invalidRows}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Duplikaty</div>
                  <div className="stat-value" style={{ fontSize: 20, color: preview.duplicateCount > 0 ? 'var(--orange)' : undefined }}>{preview.duplicateCount}</div>
                </div>
              </div>

              {/* Sample data */}
              {preview.sampleRows.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ fontSize: 14, marginBottom: 8, color: 'var(--text-secondary)' }}>Podgląd danych (pierwsze wiersze)</h4>
                  <div className="table-wrapper" style={{ maxHeight: 200, overflow: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          {preview.headers.map(h => <th key={h}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.sampleRows.slice(0, 5).map((row, i) => (
                          <tr key={i}>
                            {preview.headers.map(h => <td key={h} style={{ fontSize: 12 }}>{row[h] || '—'}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Validation errors */}
              {preview.validationErrors.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ fontSize: 14, marginBottom: 8, color: 'var(--red)' }}>Błędy walidacji</h4>
                  <div style={{ maxHeight: 150, overflow: 'auto', background: 'var(--bg-primary)', borderRadius: 'var(--radius)', padding: '8px 12px' }}>
                    {preview.validationErrors.slice(0, 20).map((e, i) => (
                      <div key={i} style={{ fontSize: 12, color: 'var(--red)', padding: '2px 0' }}>
                        Wiersz {e.row}: {e.field} — {e.message} {e.value ? `(wartość: "${e.value}")` : ''}
                      </div>
                    ))}
                    {preview.validationErrors.length > 20 && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                        ...i {preview.validationErrors.length - 20} więcej
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" onClick={() => setStep('upload')}>Wstecz</button>
                <button className="btn btn-primary" onClick={() => setStep('mapping')}>Konfiguruj mapowanie</button>
              </div>
            </div>
          )}

          {/* ── Step: Mapping ── */}
          {step === 'mapping' && preview && (
            <div>
              <h4 style={{ fontSize: 14, marginBottom: 12, color: 'var(--text-secondary)' }}>Mapowanie kolumn</h4>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                Przypisz kolumny z pliku do pól w systemie. Pola oznaczone * są wymagane.
              </p>

              <div style={{ maxHeight: 400, overflow: 'auto' }}>
                {preview.headers.map(header => (
                  <div key={header} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <span style={{ flex: '0 0 200px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {header}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>→</span>
                    <select
                      className="form-select"
                      value={mapping[header] || ''}
                      onChange={e => handleMappingChange(header, e.target.value || null)}
                      style={{ flex: 1 }}
                    >
                      <option value="">— Pomiń —</option>
                      {targetFields.map(f => (
                        <option key={f} value={f}>
                          {TARGET_FIELD_LABELS[f] || f}
                          {['make', 'model', 'year'].includes(f) ? ' *' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button className="btn" onClick={() => setStep('preview')}>Wstecz</button>
                <button className="btn btn-primary" onClick={handleImport} disabled={loading}>
                  {loading ? 'Importowanie...' : `Importuj ${preview.validRows - preview.duplicateCount} rekordów`}
                </button>
              </div>
            </div>
          )}

          {/* ── Step: Importing ── */}
          {step === 'importing' && (
            <div className="loading">Importowanie danych...</div>
          )}

          {/* ── Step: Done ── */}
          {step === 'done' && result && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: result.imported > 0 ? 'var(--green)' : 'var(--orange)', marginBottom: 8 }}>
                  Import zakończony
                </div>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">Zaimportowano</div>
                  <div className="stat-value" style={{ fontSize: 20, color: 'var(--green)' }}>{result.imported}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Pominięto (duplikaty)</div>
                  <div className="stat-value" style={{ fontSize: 20 }}>{result.duplicatesSkipped}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Odrzucono</div>
                  <div className="stat-value" style={{ fontSize: 20, color: result.rejected > 0 ? 'var(--red)' : undefined }}>{result.rejected}</div>
                </div>
              </div>

              {result.rejectedReasons.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h4 style={{ fontSize: 14, marginBottom: 8, color: 'var(--text-secondary)' }}>Powody odrzuceń</h4>
                  <div style={{ maxHeight: 200, overflow: 'auto', background: 'var(--bg-primary)', borderRadius: 'var(--radius)', padding: '8px 12px' }}>
                    {result.rejectedReasons.slice(0, 30).map((r, i) => (
                      <div key={i} style={{ fontSize: 12, color: 'var(--red)', padding: '2px 0' }}>
                        Wiersz {r.row}: {r.reasons.join('; ')}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginTop: 16 }}>
                <button className="btn btn-primary" onClick={onClose}>Zamknij</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
