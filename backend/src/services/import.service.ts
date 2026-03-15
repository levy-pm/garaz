/**
 * Import service for CSV/Excel market offer data.
 * Handles parsing, normalization, validation, column mapping, and deduplication.
 */
import * as XLSX from 'xlsx';

// ── Column mapping presets ───────────────────────────────────────────

export const TARGET_FIELDS = [
  'vehicleType', 'make', 'model', 'year', 'version', 'equipmentVersion',
  'bodyType', 'fuelType', 'color', 'transmission', 'driveType',
  'engineCapacity', 'horsepowerKM', 'horsepowerKW', 'torque',
  'pricePLN', 'priceEUR', 'priceUSD', 'currency',
  'mileageKm', 'mileageMi',
  'accidentFree', 'accidentCount',
  'continent', 'country', 'offerUrl', 'equipment', 'notes',
] as const;

export type TargetField = typeof TARGET_FIELDS[number];

// Semantic aliases for auto-mapping
const COLUMN_ALIASES: Record<string, TargetField> = {
  // vehicleType
  'typ': 'vehicleType', 'typ pojazdu': 'vehicleType', 'vehicle type': 'vehicleType', 'type': 'vehicleType',
  // make
  'marka': 'make', 'brand': 'make', 'manufacturer': 'make',
  // model
  'model': 'model',
  // year
  'rok': 'year', 'rok produkcji': 'year', 'rocznik': 'year',
  // version
  'wersja': 'version', 'wariant': 'version',
  // equipmentVersion
  'wersja wyposazenia': 'equipmentVersion', 'wyposazenie wersja': 'equipmentVersion',
  // bodyType
  'nadwozie': 'bodyType', 'body': 'bodyType', 'body type': 'bodyType', 'typ nadwozia': 'bodyType',
  // fuelType
  'paliwo': 'fuelType', 'fuel': 'fuelType', 'fuel type': 'fuelType', 'rodzaj paliwa': 'fuelType',
  // color
  'kolor': 'color', 'colour': 'color',
  // transmission
  'skrzynia': 'transmission', 'skrzynia biegow': 'transmission', 'gearbox': 'transmission',
  // driveType
  'naped': 'driveType', 'drive': 'driveType',
  // engineCapacity
  'pojemnosc': 'engineCapacity', 'pojemnosc silnika': 'engineCapacity', 'engine capacity': 'engineCapacity',
  'pojemnosc cm3': 'engineCapacity', 'capacity': 'engineCapacity',
  // horsepowerKM
  'moc': 'horsepowerKM', 'moc km': 'horsepowerKM', 'km': 'horsepowerKM', 'hp': 'horsepowerKM',
  'horsepower': 'horsepowerKM', 'power': 'horsepowerKM',
  // horsepowerKW
  'moc kw': 'horsepowerKW', 'kw': 'horsepowerKW',
  // torque
  'moment obrotowy': 'torque', 'nm': 'torque',
  // prices
  'cena': 'pricePLN', 'cena pln': 'pricePLN', 'price': 'pricePLN', 'price pln': 'pricePLN',
  'cena eur': 'priceEUR', 'price eur': 'priceEUR',
  'cena usd': 'priceUSD', 'price usd': 'priceUSD',
  // currency
  'waluta': 'currency',
  // mileage
  'przebieg': 'mileageKm', 'przebieg km': 'mileageKm', 'mileage': 'mileageKm', 'mileage km': 'mileageKm',
  'przebieg mi': 'mileageMi', 'mileage mi': 'mileageMi', 'miles': 'mileageMi',
  // accident
  'bezwypadkowy': 'accidentFree', 'accident free': 'accidentFree', 'wypadkowy': 'accidentFree',
  'liczba wypadkow': 'accidentCount', 'wypadki': 'accidentCount', 'accident count': 'accidentCount',
  // location
  'kontynent': 'continent',
  'kraj': 'country', 'country': 'country',
  // url
  'url': 'offerUrl', 'link': 'offerUrl', 'offer url': 'offerUrl',
  // equipment
  'wyposazenie': 'equipment', 'equipment': 'equipment',
  // notes
  'notatki': 'notes', 'uwagi': 'notes', 'opis': 'notes',
};

// ── Parsing ──────────────────────────────────────────────────────────

export interface ParsedSheet {
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
}

export function parseFile(buffer: Buffer, filename: string): ParsedSheet {
  const ext = filename.toLowerCase().split('.').pop();
  if (!ext || !['csv', 'xlsx', 'xls'].includes(ext)) {
    throw new Error('Nieobsługiwany format pliku. Dozwolone: CSV, XLSX, XLS.');
  }

  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('Plik nie zawiera żadnego arkusza.');
  }

  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { header: 1, defval: '' });

  if (jsonData.length < 2) {
    throw new Error('Plik musi zawierać nagłówki i przynajmniej jeden wiersz danych.');
  }

  const headerRow = (jsonData[0] as any[]).map(h => String(h).trim());
  const dataRows = jsonData.slice(1) as any[][];

  const rows = dataRows
    .filter(row => row.some(cell => cell !== '' && cell != null))
    .map(row => {
      const record: Record<string, string> = {};
      headerRow.forEach((header, i) => {
        record[header] = row[i] != null ? String(row[i]).trim() : '';
      });
      return record;
    });

  return {
    headers: headerRow.filter(h => h !== ''),
    rows,
    totalRows: rows.length,
  };
}

// ── Auto-mapping ─────────────────────────────────────────────────────

export interface ColumnMapping {
  [sourceColumn: string]: TargetField | null;
}

export function autoMapColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const usedTargets = new Set<TargetField>();

  for (const header of headers) {
    const normalized = header.toLowerCase().trim()
      .replace(/[_\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // strip diacritics

    // Exact match in aliases
    const match = COLUMN_ALIASES[normalized];
    if (match && !usedTargets.has(match)) {
      mapping[header] = match;
      usedTargets.add(match);
      continue;
    }

    // Direct field name match
    const directMatch = TARGET_FIELDS.find(f => f.toLowerCase() === normalized);
    if (directMatch && !usedTargets.has(directMatch)) {
      mapping[header] = directMatch;
      usedTargets.add(directMatch);
      continue;
    }

    // Partial match - check if header contains a known alias
    let found = false;
    for (const [alias, target] of Object.entries(COLUMN_ALIASES)) {
      if (!usedTargets.has(target) && (normalized.includes(alias) || alias.includes(normalized))) {
        mapping[header] = target;
        usedTargets.add(target);
        found = true;
        break;
      }
    }

    if (!found) {
      mapping[header] = null;
    }
  }

  return mapping;
}

// ── Normalization ────────────────────────────────────────────────────

function normalizeBoolean(value: string): boolean | null {
  const v = value.toLowerCase().trim();
  if (['tak', 'yes', 'true', '1', 'bezwypadkowy'].includes(v)) return true;
  if (['nie', 'no', 'false', '0', 'wypadkowy'].includes(v)) return false;
  return null;
}

function parseNumber(value: string): number | null {
  if (!value || value.trim() === '') return null;
  // Handle Polish decimal format: "1 234,56" → 1234.56
  const cleaned = value.trim()
    .replace(/\s/g, '')       // remove spaces
    .replace(/[zł$€]/g, '')   // remove currency symbols
    .replace(/,(\d{1,2})$/, '.$1') // trailing comma as decimal
    .replace(/,/g, '');       // remaining commas are thousands separators

  const num = Number(cleaned);
  return isNaN(num) ? null : num;
}

function parseInteger(value: string): number | null {
  const num = parseNumber(value);
  if (num === null) return null;
  return Math.round(num);
}

// ── Validation ───────────────────────────────────────────────────────

export interface ValidationError {
  row: number;
  field: string;
  message: string;
  value: string;
}

export interface NormalizedRecord {
  data: Record<string, any>;
  errors: ValidationError[];
  warnings: string[];
  rowIndex: number;
}

const currentYear = new Date().getFullYear();

export function normalizeAndValidateRow(
  row: Record<string, string>,
  mapping: ColumnMapping,
  rowIndex: number,
): NormalizedRecord {
  const data: Record<string, any> = {};
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // Apply mapping
  for (const [sourceCol, targetField] of Object.entries(mapping)) {
    if (!targetField) continue;
    const rawValue = row[sourceCol] ?? '';
    data[targetField] = rawValue;
  }

  // Normalize and validate each field
  const result: Record<string, any> = {};

  // vehicleType - default 'Auto'
  result.vehicleType = (data.vehicleType || 'Auto').trim();

  // make (required)
  const make = (data.make || '').trim();
  if (!make) {
    errors.push({ row: rowIndex, field: 'make', message: 'Marka jest wymagana', value: '' });
  }
  result.make = make;

  // model (required)
  const model = (data.model || '').trim();
  if (!model) {
    errors.push({ row: rowIndex, field: 'model', message: 'Model jest wymagany', value: '' });
  }
  result.model = model;

  // year (required)
  const yearVal = parseInteger(data.year || '');
  if (yearVal === null || yearVal < 1900 || yearVal > currentYear) {
    errors.push({ row: rowIndex, field: 'year', message: `Rok musi być między 1900 a ${currentYear}`, value: data.year || '' });
  }
  result.year = yearVal || currentYear;

  // Optional string fields
  for (const field of ['version', 'equipmentVersion', 'bodyType', 'fuelType', 'color', 'transmission', 'driveType', 'continent', 'country', 'offerUrl', 'equipment', 'notes'] as const) {
    const v = (data[field] || '').trim();
    result[field] = v || null;
  }

  // Engine capacity
  const engineCapacity = parseNumber(data.engineCapacity || '');
  if (engineCapacity !== null && engineCapacity <= 0) {
    warnings.push(`Pojemność silnika: ${data.engineCapacity}`);
  }
  // If value > 200, assume cm3 and convert to liters
  result.engineCapacity = engineCapacity !== null && engineCapacity > 200
    ? Math.round(engineCapacity / 10) / 100
    : engineCapacity;

  // Power
  result.horsepowerKM = parseNumber(data.horsepowerKM || '');
  result.horsepowerKW = parseNumber(data.horsepowerKW || '');
  result.torque = parseNumber(data.torque || '');

  // Prices
  const pricePLN = parseNumber(data.pricePLN || '');
  const priceEUR = parseNumber(data.priceEUR || '');
  const priceUSD = parseNumber(data.priceUSD || '');

  if (pricePLN !== null && pricePLN < 0) {
    errors.push({ row: rowIndex, field: 'pricePLN', message: 'Cena nie może być ujemna', value: data.pricePLN || '' });
  }
  result.pricePLN = pricePLN;
  result.priceEUR = priceEUR;
  result.priceUSD = priceUSD;

  // Currency
  const rawCurrency = (data.currency || '').toUpperCase().trim();
  result.currency = ['PLN', 'EUR', 'USD'].includes(rawCurrency) ? rawCurrency : 'PLN';

  // Mileage
  const mileageKm = parseNumber(data.mileageKm || '');
  if (mileageKm !== null && mileageKm < 0) {
    errors.push({ row: rowIndex, field: 'mileageKm', message: 'Przebieg nie może być ujemny', value: data.mileageKm || '' });
  }
  result.mileageKm = mileageKm;
  result.mileageMi = parseNumber(data.mileageMi || '');

  // Accident
  const accidentFreeRaw = data.accidentFree || '';
  const accidentFreeBool = normalizeBoolean(accidentFreeRaw);
  result.accidentFree = accidentFreeBool ?? true;

  const accidentCountVal = parseInteger(data.accidentCount || '');
  result.accidentCount = accidentCountVal !== null && accidentCountVal >= 0 ? accidentCountVal : 0;
  // Sync: if accidentCount > 0, force accidentFree = false
  if (result.accidentCount > 0) {
    result.accidentFree = false;
  }

  result.damaged = false;
  result.damageDescription = null;

  return { data: result, errors, warnings, rowIndex };
}

// ── Preview Result ───────────────────────────────────────────────────

export interface ImportPreview {
  headers: string[];
  mapping: ColumnMapping;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  sampleRows: Record<string, string>[];
  validationErrors: ValidationError[];
  duplicateCount: number;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  rejected: number;
  rejectedReasons: { row: number; reasons: string[] }[];
  duplicatesSkipped: number;
}

// ── Deduplication ────────────────────────────────────────────────────

export interface ExistingOfferKey {
  offerUrl?: string | null;
  make: string;
  model: string;
  year: number;
  pricePLN?: number | null;
  mileageKm?: number | null;
}

function makeDedupeKey(record: ExistingOfferKey): string {
  if (record.offerUrl) {
    return `url:${record.offerUrl}`;
  }
  return `heur:${record.make}|${record.model}|${record.year}|${record.pricePLN ?? ''}|${record.mileageKm ?? ''}`;
}

export function findDuplicates(
  newRecords: ExistingOfferKey[],
  existingOffers: ExistingOfferKey[],
): Set<number> {
  const existingKeys = new Set(existingOffers.map(makeDedupeKey));
  const duplicateIndices = new Set<number>();

  newRecords.forEach((record, index) => {
    const key = makeDedupeKey(record);
    if (existingKeys.has(key)) {
      duplicateIndices.add(index);
    }
    // Also track within the batch itself
    existingKeys.add(key);
  });

  return duplicateIndices;
}
