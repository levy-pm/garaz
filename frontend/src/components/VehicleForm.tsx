import { useEffect, useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import SearchableSelect from './SearchableSelect';
import api from '../api/client';

export interface VehicleFormData {
  vehicleType: string;
  make: string;
  model: string;
  year: number;
  version: string;
  equipmentVersion: string;
  bodyType: string;
  fuelType: string;
  color: string;
  transmission: string;
  driveType: string;
  engineCode: string;
  engineFamily: string;
  engineCapacity: number | '';
  horsepowerKM: number | '';
  horsepowerKW: number | '';
  torque: number | '';
  pricePLN: number | '';
  priceUSD: number | '';
  priceEUR: number | '';
  currency: string;
  mileageKm: number | '';
  mileageMi: number | '';
  accidentFree: string;
  damaged: string;
  damageDescription: string;
  continent: string;
  country: string;
  notes: string;
  // MarketOffer extras
  offerUrl?: string;
  equipment?: string;
}

const vehicleTypes = ['Auto', 'Motocykl', 'Bus', 'Ciężarowy', 'Kamper'];
const bodyTypes = ['Sedan', 'Kombi', 'Kabriolet', 'Van', 'SUV', 'Dostawczy', 'Coupe', 'Minivan', 'Bus'];
const fuelTypes = ['Benzyna', 'Diesel', 'PHEV Hybryda-benzyna', 'MHEV Hybryda-benzyna', 'PHEV Hybryda-diesel', 'MHEV Hybryda-diesel', 'Wodór', 'Elektryczny', 'Benzyna-gaz'];
const colors = ['Czarny', 'Biały', 'Niebieski', 'Czerwony', 'Szary', 'Żółty', 'Srebrny', 'Zielony', 'Pomarańczowy', 'Kremowy', 'Brązowy', 'Fioletowy', 'Granatowy'];
const transmissions = ['Manualna', 'Automatyczna', 'Zautomatyzowana'];
const driveTypes = ['FWD', 'RWD', 'AWD'];

const continents: Record<string, string[]> = {
  'Europa': ['Polska', 'Niemcy', 'Francja', 'Włochy', 'Hiszpania', 'Holandia', 'Belgia', 'Austria', 'Szwajcaria', 'Czechy', 'Słowacja', 'Wielka Brytania', 'Szwecja', 'Norwegia', 'Dania', 'Finlandia', 'Rumunia', 'Węgry', 'Portugalia', 'Litwa', 'Łotwa', 'Estonia', 'Chorwacja', 'Bułgaria', 'Ukraina'],
  'Ameryka Północna': ['USA', 'Kanada', 'Meksyk'],
  'Ameryka Południowa': ['Brazylia', 'Argentyna', 'Chile', 'Kolumbia'],
  'Azja': ['Japonia', 'Korea Południowa', 'Chiny', 'Indie', 'Turcja', 'Zjednoczone Emiraty Arabskie'],
  'Afryka': ['RPA', 'Maroko', 'Egipt'],
  'Australia i Oceania': ['Australia', 'Nowa Zelandia'],
};

// Conversion rates (approximate, for demo — production would use live API)
const EUR_TO_PLN = 4.32;
const USD_TO_PLN = 4.05;
const KW_TO_KM = 1.35962;
const MI_TO_KM = 1.60934;

const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => currentYear - i);

interface Props {
  defaultValues?: Partial<VehicleFormData>;
  onSubmit: (data: any) => void;
  onCancel?: () => void;
  showOfferFields?: boolean;
  submitLabel?: string;
}

export default function VehicleForm({ defaultValues, onSubmit, onCancel, showOfferFields, submitLabel = 'Zapisz' }: Props) {
  const form = useForm<VehicleFormData>({
    defaultValues: {
      vehicleType: 'Auto',
      currency: 'PLN',
      version: '',
      equipmentVersion: '',
      ...defaultValues,
      accidentFree: defaultValues?.accidentFree !== undefined ? String(defaultValues.accidentFree) : 'true',
      damaged: defaultValues?.damaged !== undefined ? String(defaultValues.damaged) : 'false',
    },
  });

  const { register, watch, setValue, handleSubmit, formState: { errors } } = form;

  const vehicleType = watch('vehicleType');
  const damaged = watch('damaged');
  const continent = watch('continent');
  const make = watch('make');
  const isMotorcycle = vehicleType === 'Motocykl';

  // Catalog data from backend
  const [catalogMakes, setCatalogMakes] = useState<string[]>([]);
  const [catalogModels, setCatalogModels] = useState<string[]>([]);

  // Load previously used makes
  useEffect(() => {
    api.get<string[]>('/catalog/makes')
      .then(res => setCatalogMakes(res.data))
      .catch(() => {});
  }, []);

  // Load previously used models for selected make
  useEffect(() => {
    if (!make) {
      setCatalogModels([]);
      return;
    }
    api.get<string[]>('/catalog/models', { params: { make } })
      .then(res => setCatalogModels(res.data))
      .catch(() => setCatalogModels([]));
  }, [make]);

  // KM <-> kW auto-conversion
  useAutoConvert(form, 'horsepowerKM', 'horsepowerKW', (km) => Math.round(km / KW_TO_KM * 100) / 100);
  useAutoConvert(form, 'horsepowerKW', 'horsepowerKM', (kw) => Math.round(kw * KW_TO_KM * 100) / 100);

  // km <-> mi auto-conversion
  useAutoConvert(form, 'mileageKm', 'mileageMi', (km) => Math.round(km / MI_TO_KM));
  useAutoConvert(form, 'mileageMi', 'mileageKm', (mi) => Math.round(mi * MI_TO_KM));

  // Price auto-conversion
  useAutoConvert(form, 'pricePLN', 'priceEUR', (pln) => Math.round(pln / EUR_TO_PLN));
  useAutoConvert(form, 'pricePLN', 'priceUSD', (pln) => Math.round(pln / USD_TO_PLN));
  useAutoConvert(form, 'priceEUR', 'pricePLN', (eur) => Math.round(eur * EUR_TO_PLN));
  useAutoConvert(form, 'priceEUR', 'priceUSD', (eur) => Math.round(eur * EUR_TO_PLN / USD_TO_PLN));
  useAutoConvert(form, 'priceUSD', 'pricePLN', (usd) => Math.round(usd * USD_TO_PLN));
  useAutoConvert(form, 'priceUSD', 'priceEUR', (usd) => Math.round(usd * USD_TO_PLN / EUR_TO_PLN));

  const processSubmit = (data: VehicleFormData) => {
    const cleaned: any = { ...data };
    cleaned.accidentFree = data.accidentFree === 'true';
    cleaned.damaged = data.damaged === 'true';
    // Convert empty strings to null for optional numeric fields
    const numericFields = ['engineCapacity', 'horsepowerKM', 'horsepowerKW', 'torque', 'pricePLN', 'priceUSD', 'priceEUR', 'mileageKm', 'mileageMi'];
    for (const f of numericFields) {
      if (cleaned[f] === '' || cleaned[f] === undefined) {
        cleaned[f] = null;
      } else {
        cleaned[f] = Number(cleaned[f]);
      }
    }
    // year is required — convert to number (validation ensures it's set)
    cleaned.year = Number(cleaned.year);
    if (!cleaned.damageDescription) cleaned.damageDescription = null;
    if (!cleaned.continent) cleaned.continent = null;
    if (!cleaned.country) cleaned.country = null;
    if (!cleaned.version) cleaned.version = null;
    if (!cleaned.equipmentVersion) cleaned.equipmentVersion = null;
    if (!cleaned.driveType) cleaned.driveType = null;
    onSubmit(cleaned);
  };

  return (
    <form onSubmit={handleSubmit(processSubmit)}>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Typ pojazdu *</label>
          <select className="form-select" {...register('vehicleType', { required: true })}>
            {vehicleTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Marka *</label>
          <SearchableSelect
            options={catalogMakes}
            value={make || ''}
            onChange={(val) => {
              setValue('make', val, { shouldValidate: true });
              setValue('model', '');
            }}
            placeholder="Szukaj marki..."
          />
          <input type="hidden" {...register('make', { required: 'Marka jest wymagana' })} />
          {errors.make && <span className="form-error">{errors.make.message}</span>}
        </div>
        <div className="form-group">
          <label className="form-label">Model *</label>
          <SearchableSelect
            options={catalogModels}
            value={watch('model') || ''}
            onChange={(val) => setValue('model', val, { shouldValidate: true })}
            placeholder={make ? 'Szukaj modelu...' : 'Najpierw wybierz markę'}
            disabled={!make}
          />
          <input type="hidden" {...register('model', { required: 'Model jest wymagany' })} />
          {errors.model && <span className="form-error">{errors.model.message}</span>}
        </div>
        <div className="form-group">
          <label className="form-label">Rok *</label>
          <select className="form-select" {...register('year', { required: 'Rok jest wymagany', valueAsNumber: true, validate: v => (v && v >= 1900) || 'Rok jest wymagany' })}>
            <option value="">Wybierz</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {errors.year && <span className="form-error">{errors.year.message}</span>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Wersja</label>
          <input className="form-input" {...register('version')} placeholder="np. xDrive, M Sport, GTI..." />
        </div>
        <div className="form-group">
          <label className="form-label">Wersja wyposażenia</label>
          <input className="form-input" {...register('equipmentVersion')} placeholder="np. Comfort, Luxury, Sport Line..." />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Nadwozie</label>
          <select className="form-select" {...register('bodyType')}>
            <option value="">Wybierz</option>
            {bodyTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Paliwo</label>
          <select className="form-select" {...register('fuelType')}>
            <option value="">Wybierz</option>
            {fuelTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Kolor</label>
          <select className="form-select" {...register('color')}>
            <option value="">Wybierz</option>
            {colors.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {!isMotorcycle && (
          <div className="form-group">
            <label className="form-label">Skrzynia biegów</label>
            <select className="form-select" {...register('transmission')}>
              <option value="">Wybierz</option>
              {transmissions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}
        {!isMotorcycle && (
          <div className="form-group">
            <label className="form-label">Napęd</label>
            <select className="form-select" {...register('driveType')}>
              <option value="">Wybierz</option>
              {driveTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Kod silnika</label>
          <input className="form-input" {...register('engineCode')} placeholder="np. N47D20" />
        </div>
        <div className="form-group">
          <label className="form-label">Rodzina silnika</label>
          <input className="form-input" {...register('engineFamily')} placeholder="np. N47" />
        </div>
        <div className="form-group">
          <label className="form-label">Pojemność</label>
          <div className="input-with-unit">
            <input className="form-input" type="number" step="0.1" {...register('engineCapacity')} placeholder="np. 2.0" />
            <span className="input-unit">l</span>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Moment obrotowy</label>
          <div className="input-with-unit">
            <input className="form-input" type="number" {...register('torque')} placeholder="np. 350" />
            <span className="input-unit">Nm</span>
          </div>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Moc</label>
          <div className="input-with-unit">
            <input className="form-input" type="number" step="0.01" {...register('horsepowerKM')} placeholder="np. 184" />
            <span className="input-unit">KM</span>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Moc</label>
          <div className="input-with-unit">
            <input className="form-input" type="number" step="0.01" {...register('horsepowerKW')} placeholder="np. 135" />
            <span className="input-unit">kW</span>
          </div>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Cena</label>
          <div className="input-with-unit">
            <input className="form-input" type="number" {...register('pricePLN')} placeholder="Cena" />
            <span className="input-unit">PLN</span>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Cena</label>
          <div className="input-with-unit">
            <input className="form-input" type="number" {...register('priceEUR')} placeholder="Cena" />
            <span className="input-unit">EUR</span>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Cena</label>
          <div className="input-with-unit">
            <input className="form-input" type="number" {...register('priceUSD')} placeholder="Cena" />
            <span className="input-unit">USD</span>
          </div>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Przebieg</label>
          <div className="input-with-unit">
            <input className="form-input" type="number" {...register('mileageKm')} placeholder="Przebieg" />
            <span className="input-unit">km</span>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Przebieg</label>
          <div className="input-with-unit">
            <input className="form-input" type="number" {...register('mileageMi')} placeholder="Przebieg" />
            <span className="input-unit">mi</span>
          </div>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Bezwypadkowy</label>
          <select className="form-select" {...register('accidentFree')}>
            <option value="true">Tak</option>
            <option value="false">Nie</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Uszkodzony</label>
          <select className="form-select" {...register('damaged')}>
            <option value="false">Nie</option>
            <option value="true">Tak</option>
          </select>
        </div>
      </div>

      {damaged === 'true' && (
        <div className="form-group">
          <label className="form-label">Opis uszkodzenia</label>
          <textarea className="form-textarea" {...register('damageDescription')} placeholder="Opisz uszkodzenia..." />
        </div>
      )}

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Kontynent</label>
          <select className="form-select" {...register('continent')} onChange={(e) => { setValue('continent', e.target.value); setValue('country', ''); }}>
            <option value="">Wybierz</option>
            {Object.keys(continents).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Kraj</label>
          <select className="form-select" {...register('country')}>
            <option value="">Wybierz</option>
            {continent && continents[continent]?.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {showOfferFields && (
        <>
          <div className="form-group">
            <label className="form-label">Link do oferty</label>
            <input className="form-input" {...register('offerUrl')} placeholder="https://..." />
          </div>
          <div className="form-group">
            <label className="form-label">Wyposażenie</label>
            <textarea className="form-textarea" {...register('equipment')} placeholder="Lista wyposażenia..." />
          </div>
        </>
      )}

      <div className="form-group">
        <label className="form-label">Notatki</label>
        <textarea className="form-textarea" {...register('notes')} placeholder="Dodatkowe uwagi..." />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
        {onCancel && <button type="button" className="btn" onClick={onCancel}>Anuluj</button>}
        <button type="submit" className="btn btn-primary">{submitLabel}</button>
      </div>
    </form>
  );
}

// Hook for auto-conversion between two fields
function useAutoConvert(
  form: UseFormReturn<VehicleFormData>,
  sourceField: keyof VehicleFormData,
  targetField: keyof VehicleFormData,
  convert: (val: number) => number
) {
  const value = form.watch(sourceField);

  useEffect(() => {
    // Only run if the source field is currently focused
    const el = document.querySelector(`[name="${sourceField}"]`) as HTMLElement | null;
    if (el && document.activeElement === el) {
      const num = Number(value);
      if (value !== '' && !isNaN(num) && num > 0) {
        form.setValue(targetField as any, convert(num) as any, { shouldDirty: false });
      }
    }
  }, [value]);
}
