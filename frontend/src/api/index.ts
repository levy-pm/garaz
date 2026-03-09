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

export interface ProfitabilityResult {
  type: string;
  avgMarketPrice: number;
  purchasePrice: number;
  totalCosts: number;
  breakdown: Record<string, number>;
  incomeTax: number;
  desiredMargin: number;
  totalWithTaxAndMargin: number;
  maxBuyPrice: number;
  estimatedProfit: number;
  profitable: boolean;
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
  calculate: (data: { vehicleId: number; type: string; purchasePrice: number; purchaseCurrency: string; isImport: boolean }) =>
    api.post<ProfitabilityResult>('/profitability/calculate', data).then(r => r.data),
};

export const authApi = {
  login: (login: string, password: string) =>
    api.post<{ success: boolean; message?: string }>('/auth/login', { login, password }).then(r => r.data),
  logout: () =>
    api.post('/auth/logout').then(r => r.data),
  session: () =>
    api.get<{ authenticated: boolean }>('/auth/session').then(r => r.data),
};
