import api from './client';

// Generic CRUD factory with pagination support
function createCrud<T>(endpoint: string) {
  return {
    getAll: (params?: Record<string, any>) => api.get<{ items: T[]; total: number; page: number; limit: number; totalPages: number }>(endpoint, { params }).then(r => r.data),
    getOne: (id: number) => api.get<T>(`${endpoint}/${id}`).then(r => r.data),
    create: (data: Partial<T>) => api.post<T>(endpoint, data).then(r => r.data),
    update: (id: number, data: Partial<T>) => api.put<T>(`${endpoint}/${id}`, data).then(r => r.data),
    remove: (id: number) => api.delete<T>(`${endpoint}/${id}`).then(r => r.data),
  };
}

export interface CheckedVehicle {
  id: number;
  vehicleType: string;
  make: string;
  model: string;
  year: number;
  version?: string;
  equipmentVersion?: string;
  bodyType?: string;
  fuelType?: string;
  color?: string;
  transmission?: string;
  driveType?: string;
  engineCode?: string;
  engineFamily?: string;
  engineCapacity?: number;
  horsepowerKM?: number;
  horsepowerKW?: number;
  torque?: number;
  pricePLN?: number;
  priceUSD?: number;
  priceEUR?: number;
  currency: string;
  mileageKm?: number;
  mileageMi?: number;
  accidentFree: boolean;
  accidentCount: number;
  damaged: boolean;
  damageDescription?: string;
  continent?: string;
  country?: string;
  notes?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  marketOffers?: MarketOffer[];
}

export interface MarketOffer {
  id: number;
  checkedVehicleId?: number;
  checkedVehicle?: CheckedVehicle;
  vehicleType: string;
  make: string;
  model: string;
  year: number;
  version?: string;
  equipmentVersion?: string;
  bodyType?: string;
  fuelType?: string;
  color?: string;
  transmission?: string;
  driveType?: string;
  engineCode?: string;
  engineFamily?: string;
  engineCapacity?: number;
  horsepowerKM?: number;
  horsepowerKW?: number;
  torque?: number;
  pricePLN?: number;
  priceUSD?: number;
  priceEUR?: number;
  currency: string;
  mileageKm?: number;
  mileageMi?: number;
  accidentFree: boolean;
  accidentCount: number;
  damaged: boolean;
  damageDescription?: string;
  continent?: string;
  country?: string;
  offerUrl?: string;
  equipment?: string;
  notes?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  id: number;
  exciseDutySmall: number;
  exciseDutyLarge: number;
  customsDuty: number;
  incomeTax: number;
  vat: number;
  estimatedRepairCost: number;
  desiredMargin: number;
  transportCost: number;
  registrationCost: number;
  expertCost: number;
  translationCost: number;
  inspectionCost: number;
  exchangeRateEUR: number;
  exchangeRateUSD: number;
  desiredROI: number;
  accidentDiscountPercent: number;
  createdAt: string;
  updatedAt: string;
}

export interface MarketStats {
  yearStats: {
    count: number;
    avgPrice: number | null;
    medianPrice: number | null;
    avgMileage: number | null;
    medianMileage: number | null;
  };
  modelStats: {
    count: number;
    avgPrice: number | null;
    medianPrice: number | null;
    avgMileage: number | null;
    medianMileage: number | null;
  };
  proposedPrice: number | null;
  proposedPriceAdjusted: number | null;
  accidentDiscount: number;
  accidentCount: number;
}

export interface MarketTrend {
  month: string;
  avgPrice: number | null;
  avgMileage: number | null;
  accidentFreeRate: number | null;
  offerCount: number;
}

export interface MarketAnalysis {
  vehicle: { id: number; make: string; model: string; year: number };
  trends: MarketTrend[];
  totalOffers: number;
}

export type SourceRegion = 'EU' | 'NON_EU';
export type PurchaseCurrency = 'PLN' | 'EUR' | 'USD';
export type CalcMode = 'AUCTION' | 'BUY_NOW' | 'MAX_BID';

export interface ProfitabilityRequest {
  vehicleId: number;
  purchasePrice: number;
  purchaseCurrency: PurchaseCurrency;
  sourceRegion: SourceRegion;
  isNetto: boolean;
  mode: CalcMode;
  transportCost?: number;
  registrationCost?: number;
  translationCost?: number;
  inspectionCost?: number;
  appraiserCost?: number;
  repairCost?: number;
}

export interface ProfitabilityBreakdown {
  basePricePLN: number;
  customsDuty: number;
  exciseDuty: number;
  vatImport: number;
  transportCost: number;
  registrationCost: number;
  translationCost: number;
  inspectionCost: number;
  appraiserCost: number;
  repairCost: number;
  fixedCosts: number;
  totalCosts: number;
}

export interface ProfitabilityResult {
  vehicle: { id: number; make: string; model: string; year: number; engineCapacity?: number };
  avgMarketPrice: number | null;
  medianMarketPrice: number | null;
  basePricePLN: number;
  customsDuty: number;
  exciseDuty: number;
  vatImport: number;
  fixedCosts: number;
  totalCosts: number;
  grossProfit: number | null;
  incomeTax: number;
  netProfit: number | null;
  roi: number | null;
  maxBuyPricePLN: number;
  maxBuyPriceOriginalCurrency: number;
  purchaseCurrency: PurchaseCurrency;
  profitabilityDecision: 'PROFITABLE' | 'NOT_PROFITABLE' | 'NO_MARKET_DATA';
  mode: CalcMode;
  breakdown: ProfitabilityBreakdown;
}

export const checkedVehiclesApi = createCrud<CheckedVehicle>('/checked-vehicles');
export const marketOffersApi = createCrud<MarketOffer>('/market-offers');

export const settingsApi = {
  get: () => api.get<Settings>('/settings').then(r => r.data),
  update: (id: number, data: Partial<Settings>) => api.put<Settings>(`/settings/${id}`, data).then(r => r.data),
};

export const marketStatsApi = {
  getForVehicle: (vehicleId: number) =>
    api.get<MarketStats>(`/checked-vehicles/${vehicleId}/market-stats`).then(r => r.data),
};

export const marketAnalysisApi = {
  get: (vehicleId: number, dateFrom?: string, dateTo?: string) =>
    api.get<MarketAnalysis>('/market-analysis', { params: { vehicleId, dateFrom, dateTo } }).then(r => r.data),
};

export const profitabilityApi = {
  calculate: (data: ProfitabilityRequest) =>
    api.post<ProfitabilityResult>('/profitability/calculate', data).then(r => r.data),
};

// ── Import types ─────────────────────────────────────────────────────

export interface ImportPreview {
  headers: string[];
  mapping: Record<string, string | null>;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  sampleRows: Record<string, string>[];
  validationErrors: { row: number; field: string; message: string; value: string }[];
  duplicateCount: number;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  rejected: number;
  rejectedReasons: { row: number; reasons: string[] }[];
  duplicatesSkipped: number;
}

// ── Comparison types ─────────────────────────────────────────────────

export interface VehicleComparison {
  vehicle: {
    id: number;
    vehicleType: string;
    make: string;
    model: string;
    year: number;
    version: string | null;
    equipmentVersion: string | null;
    bodyType: string | null;
    fuelType: string | null;
    color: string | null;
    transmission: string | null;
    driveType: string | null;
    engineCapacity: number | null;
    horsepowerKM: number | null;
    horsepowerKW: number | null;
    torque: number | null;
    pricePLN: number | null;
    priceEUR: number | null;
    priceUSD: number | null;
    currency: string;
    mileageKm: number | null;
    mileageMi: number | null;
    accidentFree: boolean;
    accidentCount: number;
    damaged: boolean;
    continent: string | null;
    country: string | null;
    notes: string | null;
    equipment: string | null;
  };
  marketData: {
    offerCount: number;
    avgPrice: number | null;
    medianPrice: number | null;
    minPrice: number | null;
    maxPrice: number | null;
    avgMileage: number | null;
    proposedPrice: number | null;
    proposedPriceAdjusted: number | null;
    accidentDiscount: number;
  };
  profitability: {
    totalCosts: number;
    grossProfit: number | null;
    netProfit: number | null;
    roi: number | null;
    maxBuyPricePLN: number;
    profitabilityDecision: string;
  } | null;
}

export interface ComparisonResponse {
  comparisons: VehicleComparison[];
  settings: { accidentDiscountPercent: number };
}

export const importApi = {
  preview: (file: File, checkedVehicleId?: number) => {
    const formData = new FormData();
    formData.append('file', file);
    if (checkedVehicleId) formData.append('checkedVehicleId', String(checkedVehicleId));
    return api.post<ImportPreview>('/import/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
  commit: (file: File, mapping: Record<string, string | null>, checkedVehicleId?: number, skipDuplicates = true) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mapping', JSON.stringify(mapping));
    formData.append('skipDuplicates', String(skipDuplicates));
    if (checkedVehicleId) formData.append('checkedVehicleId', String(checkedVehicleId));
    return api.post<ImportResult>('/import/commit', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
  targetFields: () => api.get<string[]>('/import/target-fields').then(r => r.data),
};

export const comparisonApi = {
  compare: (vehicleIds: number[]) =>
    api.post<ComparisonResponse>('/comparison', { vehicleIds }).then(r => r.data),
};

export const authApi = {
  login: (login: string, password: string) =>
    api.post<{ success: boolean; message?: string }>('/auth/login', { login, password }).then(r => r.data),
  logout: () =>
    api.post('/auth/logout').then(r => r.data),
  session: () =>
    api.get<{ authenticated: boolean }>('/auth/session').then(r => r.data),
};
