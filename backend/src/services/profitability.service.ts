/**
 * Profitability calculation service.
 *
 * All calculation logic is isolated here for testability.
 * The module is pure — no database access, no side effects.
 */

// ── Types ────────────────────────────────────────────────────────────

export type SourceRegion = 'EU' | 'NON_EU';
export type PurchaseCurrency = 'PLN' | 'EUR' | 'USD';
export type CalcMode = 'AUCTION' | 'BUY_NOW' | 'MAX_BID';

export interface CalcSettings {
  exciseDutySmall: number;  // % (e.g. 3.1)
  exciseDutyLarge: number;  // % (e.g. 18.6)
  customsDuty: number;      // % (e.g. 10)
  incomeTax: number;        // % (e.g. 19)
  vat: number;              // % (e.g. 23)
  exchangeRateEUR: number;
  exchangeRateUSD: number;
  desiredROI: number;       // % (e.g. 10)
}

export interface CalcInput {
  purchasePrice: number;
  purchaseCurrency: PurchaseCurrency;
  sourceRegion: SourceRegion;
  isNetto: boolean;
  mode: CalcMode;
  engineCapacity: number | null | undefined;
  avgMarketPrice: number | null;
  medianMarketPrice: number | null;
  // Additional costs (PLN)
  transportCost: number;
  registrationCost: number;
  translationCost: number;
  inspectionCost: number;
  appraiserCost: number;
  repairCost: number;
  settings: CalcSettings;
}

export interface CalcResult {
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
  breakdown: {
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
  };
}

// ── Helpers ──────────────────────────────────────────────────────────

function getExchangeRate(currency: PurchaseCurrency, settings: CalcSettings): number {
  switch (currency) {
    case 'EUR': return settings.exchangeRateEUR;
    case 'USD': return settings.exchangeRateUSD;
    case 'PLN': return 1;
  }
}

/**
 * Get excise duty rate based on engine capacity.
 *
 * NOTE: In this MVP, excise duty is calculated based on basePricePLN (purchase price in PLN).
 * In a full implementation, excise duty should be calculated based on the vehicle's market value
 * or customs value ("wartość celna"), not necessarily the purchase price.
 */
function getExciseRate(engineCapacity: number | null | undefined, settings: CalcSettings): number {
  const capacity = engineCapacity ?? 0;
  return capacity > 2.0
    ? settings.exciseDutyLarge / 100
    : settings.exciseDutySmall / 100;
}

// ── Main Calculation ─────────────────────────────────────────────────

export function calculateProfitability(input: CalcInput): CalcResult {
  const { settings, purchaseCurrency, sourceRegion, isNetto, mode } = input;

  const exchangeRate = getExchangeRate(purchaseCurrency, settings);

  // Convert purchase price to PLN
  const basePricePLN = input.purchasePrice * exchangeRate;

  // ── Import duties ──────────────────────────────────────────────

  // Customs duty: only for NON_EU imports
  const customsDutyRate = settings.customsDuty / 100;
  const customsDuty = sourceRegion === 'NON_EU'
    ? basePricePLN * customsDutyRate
    : 0;

  // Excise duty: applies for both EU and NON_EU imports
  // NOTE: For domestic (PL) vehicles, excise would not apply, but in this MVP
  // we assume the user selects EU/NON_EU only for import scenarios.
  const exciseRate = getExciseRate(input.engineCapacity, settings);
  const exciseDuty = basePricePLN * exciseRate;

  // VAT import: only for NON_EU
  //
  // EU: No import VAT calculated as for NON_EU.
  //   In real scenarios, intra-EU transactions may have VAT implications depending
  //   on whether the seller is a business (netto → +VAT) or private (brutto → no additional VAT).
  //   For this MVP:
  //     - EU + isNetto=true: no import VAT added (assumption: margin scheme or simplified)
  //     - EU + isNetto=false: no import VAT added (price already includes VAT)
  //
  // NON_EU: VAT is calculated on (basePricePLN + customsDuty + exciseDuty).
  //   - isNetto has no effect on NON_EU import VAT calculation in this MVP,
  //     because import VAT is always assessed on customs value + duties.
  //
  // FUTURE EXTENSION: To fully handle netto/brutto for EU, the domain model would need:
  //   - seller type (business vs private)
  //   - VAT margin scheme flag
  //   - reverse charge mechanism for B2B intra-EU
  const vatRate = settings.vat / 100;
  const vatImport = sourceRegion === 'NON_EU'
    ? (basePricePLN + customsDuty + exciseDuty) * vatRate
    : 0;

  // ── Fixed costs ────────────────────────────────────────────────

  const fixedCosts =
    input.transportCost +
    input.registrationCost +
    input.translationCost +
    input.inspectionCost +
    input.appraiserCost +
    input.repairCost;

  // ── Totals ─────────────────────────────────────────────────────

  const totalCosts = basePricePLN + customsDuty + exciseDuty + vatImport + fixedCosts;

  // ── Profit (only if market data exists) ────────────────────────

  const avgMarketPrice = input.avgMarketPrice;
  const medianMarketPrice = input.medianMarketPrice;

  let grossProfit: number | null = null;
  let incomeTax = 0;
  let netProfit: number | null = null;
  let roi: number | null = null;
  let profitabilityDecision: 'PROFITABLE' | 'NOT_PROFITABLE' | 'NO_MARKET_DATA' = 'NO_MARKET_DATA';

  if (avgMarketPrice !== null && avgMarketPrice > 0) {
    grossProfit = avgMarketPrice - totalCosts;
    incomeTax = grossProfit > 0
      ? grossProfit * (settings.incomeTax / 100)
      : 0;
    netProfit = grossProfit - incomeTax;
    roi = totalCosts > 0 ? (netProfit / totalCosts) * 100 : 0;
    profitabilityDecision = netProfit > 0 ? 'PROFITABLE' : 'NOT_PROFITABLE';
  }

  // ── Reverse calculation: maxBuyPrice ───────────────────────────

  const maxBuyPricePLN = calculateMaxBuyPrice(input);
  const maxBuyPriceOriginalCurrency = exchangeRate > 0
    ? maxBuyPricePLN / exchangeRate
    : 0;

  // ── Breakdown ──────────────────────────────────────────────────

  const breakdown = {
    basePricePLN: round2(basePricePLN),
    customsDuty: round2(customsDuty),
    exciseDuty: round2(exciseDuty),
    vatImport: round2(vatImport),
    transportCost: round2(input.transportCost),
    registrationCost: round2(input.registrationCost),
    translationCost: round2(input.translationCost),
    inspectionCost: round2(input.inspectionCost),
    appraiserCost: round2(input.appraiserCost),
    repairCost: round2(input.repairCost),
    fixedCosts: round2(fixedCosts),
    totalCosts: round2(totalCosts),
  };

  return {
    avgMarketPrice: avgMarketPrice !== null ? round2(avgMarketPrice) : null,
    medianMarketPrice: medianMarketPrice !== null ? round2(medianMarketPrice) : null,
    basePricePLN: round2(basePricePLN),
    customsDuty: round2(customsDuty),
    exciseDuty: round2(exciseDuty),
    vatImport: round2(vatImport),
    fixedCosts: round2(fixedCosts),
    totalCosts: round2(totalCosts),
    grossProfit: grossProfit !== null ? round2(grossProfit) : null,
    incomeTax: round2(incomeTax),
    netProfit: netProfit !== null ? round2(netProfit) : null,
    roi: roi !== null ? round2(roi) : null,
    maxBuyPricePLN: round2(Math.max(0, maxBuyPricePLN)),
    maxBuyPriceOriginalCurrency: round2(Math.max(0, maxBuyPriceOriginalCurrency)),
    purchaseCurrency,
    profitabilityDecision,
    mode,
    breakdown,
  };
}

// ── Reverse Calculation ──────────────────────────────────────────────

/**
 * Calculate maximum purchase price (in PLN) to achieve desiredROI.
 *
 * Mathematical derivation:
 *
 * Let X = maxBasePricePLN (what we want to find)
 *
 * For NON_EU:
 *   customsDuty  = X * customsDutyRate
 *   exciseDuty   = X * exciseRate
 *   vatImport    = (X + customsDuty + exciseDuty) * vatRate
 *                = X * (1 + customsDutyRate + exciseRate) * vatRate
 *
 *   totalCosts   = X + customsDuty + exciseDuty + vatImport + fixedCosts
 *                = X * (1 + customsDutyRate + exciseRate + (1 + customsDutyRate + exciseRate) * vatRate) + fixedCosts
 *                = X * (1 + customsDutyRate + exciseRate) * (1 + vatRate) + fixedCosts
 *
 *   Let multiplier = (1 + customsDutyRate + exciseRate) * (1 + vatRate)
 *   totalCosts = X * multiplier + fixedCosts
 *
 * For EU:
 *   customsDuty = 0, vatImport = 0
 *   totalCosts  = X + exciseDuty + fixedCosts
 *              = X * (1 + exciseRate) + fixedCosts
 *
 *   Let multiplier = 1 + exciseRate
 *   totalCosts = X * multiplier + fixedCosts
 *
 * Profit condition:
 *   grossProfit = avgMarketPrice - totalCosts
 *   netProfit   = grossProfit * (1 - incomeTaxRate)    [when grossProfit > 0]
 *   desiredROI% = netProfit / totalCosts * 100
 *
 * Therefore:
 *   netProfit = desiredROI/100 * totalCosts
 *   grossProfit / (1 - incomeTaxRate) ... wait, let's redo:
 *
 *   netProfit = grossProfit - incomeTax
 *             = grossProfit - grossProfit * incomeTaxRate   [when grossProfit > 0]
 *             = grossProfit * (1 - incomeTaxRate)
 *
 *   netProfit = (desiredROI / 100) * totalCosts
 *   grossProfit * (1 - incomeTaxRate) = (desiredROI / 100) * totalCosts
 *   (avgMarketPrice - totalCosts) * (1 - incomeTaxRate) = (desiredROI / 100) * totalCosts
 *
 *   Let R = desiredROI / 100, T = incomeTaxRate
 *   avgMarketPrice - totalCosts = R * totalCosts / (1 - T)
 *   avgMarketPrice = totalCosts * (1 + R / (1 - T))
 *   totalCosts = avgMarketPrice / (1 + R / (1 - T))
 *
 *   Since totalCosts = X * multiplier + fixedCosts:
 *   X * multiplier + fixedCosts = avgMarketPrice / (1 + R / (1 - T))
 *   X = (avgMarketPrice / (1 + R / (1 - T)) - fixedCosts) / multiplier
 */
export function calculateMaxBuyPrice(input: CalcInput): number {
  const { settings, sourceRegion, avgMarketPrice } = input;

  if (avgMarketPrice === null || avgMarketPrice <= 0) {
    return 0;
  }

  const exciseRate = getExciseRate(input.engineCapacity, settings);
  const customsDutyRate = settings.customsDuty / 100;
  const vatRate = settings.vat / 100;
  const incomeTaxRate = settings.incomeTax / 100;
  const desiredROI = settings.desiredROI / 100;

  // Cost multiplier: how totalCosts relates to basePricePLN
  let multiplier: number;
  if (sourceRegion === 'NON_EU') {
    multiplier = (1 + customsDutyRate + exciseRate) * (1 + vatRate);
  } else {
    // EU: no customs duty, no import VAT
    multiplier = 1 + exciseRate;
  }

  const fixedCosts =
    input.transportCost +
    input.registrationCost +
    input.translationCost +
    input.inspectionCost +
    input.appraiserCost +
    input.repairCost;

  // maxTotalCost = avgMarketPrice / (1 + desiredROI / (1 - incomeTaxRate))
  // Handle edge case: incomeTaxRate === 1 would cause division by zero
  const netMultiplier = incomeTaxRate < 1
    ? 1 + desiredROI / (1 - incomeTaxRate)
    : 1 + desiredROI; // fallback: ignore tax in edge case

  const maxTotalCost = avgMarketPrice / netMultiplier;

  // maxBasePricePLN = (maxTotalCost - fixedCosts) / multiplier
  if (multiplier <= 0) return 0;

  const maxBasePricePLN = (maxTotalCost - fixedCosts) / multiplier;

  return maxBasePricePLN;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
