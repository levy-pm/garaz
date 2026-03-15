import { describe, it, expect } from 'vitest';
import {
  parseFile,
  autoMapColumns,
  normalizeAndValidateRow,
  findDuplicates,
  type ColumnMapping,
} from '../services/import.service';

// Helper to create a CSV buffer
function csvBuffer(content: string): Buffer {
  return Buffer.from(content, 'utf-8');
}

describe('parseFile', () => {
  it('parses CSV correctly', () => {
    const csv = 'Marka,Model,Rok,Cena\nBMW,320i,2020,85000\nAudi,A4,2019,75000';
    const result = parseFile(csvBuffer(csv), 'test.csv');

    expect(result.headers).toEqual(['Marka', 'Model', 'Rok', 'Cena']);
    expect(result.totalRows).toBe(2);
    expect(result.rows[0]['Marka']).toBe('BMW');
    expect(result.rows[1]['Model']).toBe('A4');
  });

  it('skips empty rows', () => {
    const csv = 'Marka,Model,Rok\nBMW,320i,2020\n,,\nAudi,A4,2019';
    const result = parseFile(csvBuffer(csv), 'test.csv');
    expect(result.totalRows).toBe(2);
  });

  it('throws on unsupported format', () => {
    expect(() => parseFile(Buffer.from('test'), 'test.pdf')).toThrow('Nieobsługiwany format');
  });

  it('throws on empty file', () => {
    const csv = 'Marka,Model,Rok';
    expect(() => parseFile(csvBuffer(csv), 'test.csv')).toThrow('przynajmniej jeden wiersz');
  });
});

describe('autoMapColumns', () => {
  it('maps Polish column names', () => {
    const mapping = autoMapColumns(['Marka', 'Model', 'Rok', 'Cena', 'Przebieg']);
    expect(mapping['Marka']).toBe('make');
    expect(mapping['Model']).toBe('model');
    expect(mapping['Rok']).toBe('year');
    expect(mapping['Cena']).toBe('pricePLN');
    expect(mapping['Przebieg']).toBe('mileageKm');
  });

  it('maps English column names', () => {
    const mapping = autoMapColumns(['Brand', 'Model', 'Year', 'Price', 'Mileage']);
    expect(mapping['Brand']).toBe('make');
    expect(mapping['Model']).toBe('model');
    expect(mapping['Year']).toBe('year');
  });

  it('sets null for unmapped columns', () => {
    const mapping = autoMapColumns(['Unknown_Column', 'Marka']);
    expect(mapping['Unknown_Column']).toBe(null);
    expect(mapping['Marka']).toBe('make');
  });
});

describe('normalizeAndValidateRow', () => {
  const mapping: ColumnMapping = {
    'Marka': 'make',
    'Model': 'model',
    'Rok': 'year',
    'Cena': 'pricePLN',
    'Przebieg': 'mileageKm',
    'Bezwypadkowy': 'accidentFree',
    'Wypadki': 'accidentCount',
  };

  it('normalizes valid row', () => {
    const row = { Marka: 'BMW', Model: '320i', Rok: '2020', Cena: '85000', Przebieg: '120000', Bezwypadkowy: 'Tak', Wypadki: '0' };
    const result = normalizeAndValidateRow(row, mapping, 1);

    expect(result.errors).toHaveLength(0);
    expect(result.data.make).toBe('BMW');
    expect(result.data.model).toBe('320i');
    expect(result.data.year).toBe(2020);
    expect(result.data.pricePLN).toBe(85000);
    expect(result.data.mileageKm).toBe(120000);
    expect(result.data.accidentFree).toBe(true);
    expect(result.data.accidentCount).toBe(0);
  });

  it('validates missing required fields', () => {
    const row = { Marka: '', Model: '', Rok: '', Cena: '85000', Przebieg: '', Bezwypadkowy: '', Wypadki: '' };
    const result = normalizeAndValidateRow(row, mapping, 1);

    expect(result.errors.length).toBeGreaterThanOrEqual(3);
    expect(result.errors.some(e => e.field === 'make')).toBe(true);
    expect(result.errors.some(e => e.field === 'model')).toBe(true);
    expect(result.errors.some(e => e.field === 'year')).toBe(true);
  });

  it('validates negative price', () => {
    const row = { Marka: 'BMW', Model: '320i', Rok: '2020', Cena: '-100', Przebieg: '0', Bezwypadkowy: '', Wypadki: '' };
    const result = normalizeAndValidateRow(row, mapping, 1);
    expect(result.errors.some(e => e.field === 'pricePLN')).toBe(true);
  });

  it('validates negative mileage', () => {
    const row = { Marka: 'BMW', Model: '320i', Rok: '2020', Cena: '85000', Przebieg: '-50000', Bezwypadkowy: '', Wypadki: '' };
    const result = normalizeAndValidateRow(row, mapping, 1);
    expect(result.errors.some(e => e.field === 'mileageKm')).toBe(true);
  });

  it('normalizes boolean values', () => {
    const tests: Array<[string, boolean]> = [
      ['Tak', true], ['Nie', false], ['yes', true], ['no', false],
      ['true', true], ['false', false], ['1', true], ['0', false],
    ];

    for (const [input, expected] of tests) {
      const row = { Marka: 'BMW', Model: '320i', Rok: '2020', Cena: '', Przebieg: '', Bezwypadkowy: input, Wypadki: '' };
      const result = normalizeAndValidateRow(row, mapping, 1);
      expect(result.data.accidentFree).toBe(expected);
    }
  });

  it('syncs accidentFree with accidentCount', () => {
    const row = { Marka: 'BMW', Model: '320i', Rok: '2020', Cena: '', Przebieg: '', Bezwypadkowy: 'Tak', Wypadki: '2' };
    const result = normalizeAndValidateRow(row, mapping, 1);
    expect(result.data.accidentFree).toBe(false);
    expect(result.data.accidentCount).toBe(2);
  });

  it('parses Polish number formats', () => {
    const row = { Marka: 'BMW', Model: '320i', Rok: '2020', Cena: '85 000,50', Przebieg: '120 000', Bezwypadkowy: '', Wypadki: '' };
    const result = normalizeAndValidateRow(row, mapping, 1);
    expect(result.data.pricePLN).toBe(85000.50);
    expect(result.data.mileageKm).toBe(120000);
  });

  it('converts cm3 to liters for engineCapacity', () => {
    const mapping2: ColumnMapping = { ...mapping, 'Pojemnosc': 'engineCapacity' };
    const row = { Marka: 'BMW', Model: '320i', Rok: '2020', Cena: '', Przebieg: '', Bezwypadkowy: '', Wypadki: '', Pojemnosc: '1998' };
    const result = normalizeAndValidateRow(row, mapping2, 1);
    expect(result.data.engineCapacity).toBeCloseTo(2.0, 1);
  });
});

describe('findDuplicates', () => {
  it('detects duplicates by offerUrl', () => {
    const existing = [
      { offerUrl: 'https://otomoto.pl/123', make: 'BMW', model: '320i', year: 2020, pricePLN: 85000, mileageKm: 120000 },
    ];
    const newRecords = [
      { offerUrl: 'https://otomoto.pl/123', make: 'BMW', model: '320i', year: 2020, pricePLN: 85000, mileageKm: 120000 },
      { offerUrl: 'https://otomoto.pl/456', make: 'Audi', model: 'A4', year: 2019, pricePLN: 75000, mileageKm: 100000 },
    ];

    const dups = findDuplicates(newRecords, existing);
    expect(dups.has(0)).toBe(true);
    expect(dups.has(1)).toBe(false);
  });

  it('detects duplicates by heuristic (make+model+year+price+mileage)', () => {
    const existing = [
      { make: 'BMW', model: '320i', year: 2020, pricePLN: 85000, mileageKm: 120000 },
    ];
    const newRecords = [
      { make: 'BMW', model: '320i', year: 2020, pricePLN: 85000, mileageKm: 120000 },
      { make: 'BMW', model: '320i', year: 2020, pricePLN: 90000, mileageKm: 120000 },
    ];

    const dups = findDuplicates(newRecords, existing);
    expect(dups.has(0)).toBe(true);
    expect(dups.has(1)).toBe(false);
  });

  it('detects duplicates within the same batch', () => {
    const newRecords = [
      { make: 'BMW', model: '320i', year: 2020, pricePLN: 85000, mileageKm: 120000 },
      { make: 'BMW', model: '320i', year: 2020, pricePLN: 85000, mileageKm: 120000 },
    ];

    const dups = findDuplicates(newRecords, []);
    expect(dups.has(0)).toBe(false);
    expect(dups.has(1)).toBe(true);
  });
});
