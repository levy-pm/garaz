import api from './client';

// Generic CRUD factory
function createCrud<T>(endpoint: string) {
  return {
    getAll: (params?: Record<string, any>) => api.get<T[]>(endpoint, { params }).then(r => r.data),
    getOne: (id: number) => api.get<T>(`${endpoint}/${id}`).then(r => r.data),
    create: (data: Partial<T>) => api.post<T>(endpoint, data).then(r => r.data),
    update: (id: number, data: Partial<T>) => api.put<T>(`${endpoint}/${id}`, data).then(r => r.data),
    remove: (id: number) => api.delete<T>(`${endpoint}/${id}`).then(r => r.data),
  };
}

export interface TargetCar {
  id: number;
  make: string;
  model: string;
  year: number;
  bodyType?: string;
  fuelType?: string;
  engineCapacity?: number;
  horsepower?: number;
  transmission?: string;
  color?: string;
  maxBudget?: number;
  notes?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ComparisonOffer {
  id: number;
  targetCarId: number;
  targetCar?: TargetCar;
  source: string;
  sourceUrl?: string;
  price: number;
  currency: string;
  mileage?: number;
  year?: number;
  condition?: string;
  location?: string;
  notes?: string;
  isArchived: boolean;
  createdAt: string;
}

export interface EngineNote {
  id: number;
  engineCode: string;
  engineFamily?: string;
  fuelType?: string;
  displacement?: number;
  horsepower?: number;
  torque?: number;
  knownIssues?: string;
  maintenance?: string;
  reliability?: number;
  notes?: string;
  isArchived: boolean;
  createdAt: string;
}

export interface ValuationCalc {
  id: number;
  targetCarId?: number;
  targetCar?: TargetCar;
  name: string;
  basePrice: number;
  repairCost: number;
  paintCost: number;
  partsCost: number;
  transportCost: number;
  otherCosts: number;
  totalCost: number;
  estimatedValue: number;
  profit: number;
  costProfileId?: number;
  notes?: string;
  isArchived: boolean;
  createdAt: string;
}

export interface AuctionCalc {
  id: number;
  targetCarId?: number;
  targetCar?: TargetCar;
  name: string;
  startingPrice: number;
  maxBid: number;
  auctionFee: number;
  buyerPremium: number;
  transportCost: number;
  repairEstimate: number;
  otherCosts: number;
  totalCost: number;
  estimatedValue: number;
  potentialProfit: number;
  costProfileId?: number;
  notes?: string;
  isArchived: boolean;
  createdAt: string;
}

export interface CostProfile {
  id: number;
  name: string;
  defaultRepairRate: number;
  defaultPaintRate: number;
  defaultTransport: number;
  defaultAuctionFee: number;
  defaultBuyerPremium: number;
  taxRate: number;
  marginTarget: number;
  currency: string;
  notes?: string;
  isDefault: boolean;
  isArchived: boolean;
  createdAt: string;
}

export const targetCarsApi = createCrud<TargetCar>('/target-cars');
export const comparisonOffersApi = createCrud<ComparisonOffer>('/comparison-offers');
export const engineNotesApi = createCrud<EngineNote>('/engine-notes');
export const valuationCalcsApi = createCrud<ValuationCalc>('/valuation-calcs');
export const auctionCalcsApi = createCrud<AuctionCalc>('/auction-calcs');
export const costProfilesApi = createCrud<CostProfile>('/cost-profiles');
