import { describe, it, expect } from 'vitest';
import {
  calculateProfitability,
  calculateMaxBuyPrice,
  type CalcInput,
  type CalcSettings,
} from '../services/profitability.service';

const defaultSettings: CalcSettings = {
  exciseDutySmall: 3.1,
  exciseDutyLarge: 18.6,
  customsDuty: 10,
  incomeTax: 19,
  vat: 23,
  exchangeRateEUR: 4.30,
  exchangeRateUSD: 3.95,
  desiredROI: 10,
};

function makeInput(overrides: Partial<CalcInput> = {}): CalcInput {
  return {
    purchasePrice: 10000,
    purchaseCurrency: 'EUR',
    sourceRegion: 'EU',
    isNetto: false,
    mode: 'AUCTION',
    engineCapacity: 1.6,
    avgMarketPrice: 60000,
    medianMarketPrice: 58000,
    transportCost: 2000,
    registrationCost: 500,
    translationCost: 200,
    inspectionCost: 100,
    appraiserCost: 300,
    repairCost: 0,
    settings: { ...defaultSettings },
    ...overrides,
  };
}

describe('calculateProfitability', () => {
  // ── EU region ──────────────────────────────────────────────────

  it('EU: no customs duty and no import VAT', () => {
    const result = calculateProfitability(makeInput({ sourceRegion: 'EU' }));
    expect(result.customsDuty).toBe(0);
    expect(result.vatImport).toBe(0);
    expect(result.exciseDuty).toBeGreaterThan(0);
  });

  it('EU: excise duty for small engine (<= 2.0)', () => {
    const result = calculateProfitability(makeInput({
      sourceRegion: 'EU',
      engineCapacity: 1.6,
      purchasePrice: 10000,
      purchaseCurrency: 'PLN',
    }));
    // 10000 * 0.031 = 310
    expect(result.exciseDuty).toBe(310);
  });

  it('EU: excise duty for large engine (> 2.0)', () => {
    const result = calculateProfitability(makeInput({
      sourceRegion: 'EU',
      engineCapacity: 3.0,
      purchasePrice: 10000,
      purchaseCurrency: 'PLN',
    }));
    // 10000 * 0.186 = 1860
    expect(result.exciseDuty).toBe(1860);
  });

  // ── NON_EU region ──────────────────────────────────────────────

  it('NON_EU: includes customs duty, excise duty, and import VAT', () => {
    const result = calculateProfitability(makeInput({
      sourceRegion: 'NON_EU',
      purchasePrice: 10000,
      purchaseCurrency: 'PLN',
      engineCapacity: 1.6,
    }));

    // customsDuty = 10000 * 0.10 = 1000
    expect(result.customsDuty).toBe(1000);

    // exciseDuty = 10000 * 0.031 = 310
    expect(result.exciseDuty).toBe(310);

    // vatImport = (10000 + 1000 + 310) * 0.23 = 11310 * 0.23 = 2601.30
    expect(result.vatImport).toBe(2601.30);
  });

  it('NON_EU: large engine uses higher excise rate', () => {
    const result = calculateProfitability(makeInput({
      sourceRegion: 'NON_EU',
      purchasePrice: 10000,
      purchaseCurrency: 'PLN',
      engineCapacity: 3.0,
    }));
    expect(result.exciseDuty).toBe(1860);
    // vatImport = (10000 + 1000 + 1860) * 0.23 = 12860 * 0.23 = 2957.80
    expect(result.vatImport).toBe(2957.80);
  });

  // ── Profit calculation ─────────────────────────────────────────

  it('positive grossProfit: calculates incomeTax and positive netProfit', () => {
    const result = calculateProfitability(makeInput({
      sourceRegion: 'EU',
      purchasePrice: 5000,
      purchaseCurrency: 'PLN',
      avgMarketPrice: 50000,
      engineCapacity: 1.6,
      transportCost: 0,
      registrationCost: 0,
      translationCost: 0,
      inspectionCost: 0,
      appraiserCost: 0,
      repairCost: 0,
    }));

    // basePricePLN = 5000
    // exciseDuty = 5000 * 0.031 = 155
    // totalCosts = 5000 + 155 = 5155
    // grossProfit = 50000 - 5155 = 44845
    // incomeTax = 44845 * 0.19 = 8520.55
    // netProfit = 44845 - 8520.55 = 36324.45
    expect(result.totalCosts).toBe(5155);
    expect(result.grossProfit).toBe(44845);
    expect(result.incomeTax).toBe(8520.55);
    expect(result.netProfit).toBe(36324.45);
    expect(result.profitabilityDecision).toBe('PROFITABLE');
  });

  it('negative grossProfit: no incomeTax, NOT_PROFITABLE', () => {
    const result = calculateProfitability(makeInput({
      sourceRegion: 'NON_EU',
      purchasePrice: 50000,
      purchaseCurrency: 'PLN',
      avgMarketPrice: 30000,
      engineCapacity: 1.6,
      transportCost: 5000,
      registrationCost: 0,
      translationCost: 0,
      inspectionCost: 0,
      appraiserCost: 0,
      repairCost: 0,
    }));

    expect(result.grossProfit).toBeLessThan(0);
    expect(result.incomeTax).toBe(0);
    expect(result.netProfit).toBeLessThan(0);
    expect(result.profitabilityDecision).toBe('NOT_PROFITABLE');
  });

  // ── Currency conversion ────────────────────────────────────────

  it('EUR currency: converts to PLN using exchange rate', () => {
    const result = calculateProfitability(makeInput({
      purchasePrice: 10000,
      purchaseCurrency: 'EUR',
      sourceRegion: 'EU',
      engineCapacity: 1.6,
      transportCost: 0,
      registrationCost: 0,
      translationCost: 0,
      inspectionCost: 0,
      appraiserCost: 0,
      repairCost: 0,
    }));
    // basePricePLN = 10000 * 4.30 = 43000
    expect(result.basePricePLN).toBe(43000);
  });

  it('USD currency: converts to PLN using exchange rate', () => {
    const result = calculateProfitability(makeInput({
      purchasePrice: 10000,
      purchaseCurrency: 'USD',
      sourceRegion: 'EU',
      engineCapacity: 1.6,
      transportCost: 0,
      registrationCost: 0,
      translationCost: 0,
      inspectionCost: 0,
      appraiserCost: 0,
      repairCost: 0,
    }));
    // basePricePLN = 10000 * 3.95 = 39500
    expect(result.basePricePLN).toBe(39500);
  });

  it('PLN currency: no conversion (rate = 1)', () => {
    const result = calculateProfitability(makeInput({
      purchasePrice: 10000,
      purchaseCurrency: 'PLN',
      sourceRegion: 'EU',
      engineCapacity: 1.6,
      transportCost: 0,
      registrationCost: 0,
      translationCost: 0,
      inspectionCost: 0,
      appraiserCost: 0,
      repairCost: 0,
    }));
    expect(result.basePricePLN).toBe(10000);
  });

  // ── No market data ─────────────────────────────────────────────

  it('no avgMarketPrice: returns NO_MARKET_DATA, nulls for profit', () => {
    const result = calculateProfitability(makeInput({
      avgMarketPrice: null,
      medianMarketPrice: null,
    }));
    expect(result.profitabilityDecision).toBe('NO_MARKET_DATA');
    expect(result.grossProfit).toBeNull();
    expect(result.netProfit).toBeNull();
    expect(result.roi).toBeNull();
  });

  // ── ROI calculation ────────────────────────────────────────────

  it('ROI: calculated as netProfit / totalCosts * 100', () => {
    const result = calculateProfitability(makeInput({
      sourceRegion: 'EU',
      purchasePrice: 10000,
      purchaseCurrency: 'PLN',
      avgMarketPrice: 20000,
      engineCapacity: 1.6,
      transportCost: 0,
      registrationCost: 0,
      translationCost: 0,
      inspectionCost: 0,
      appraiserCost: 0,
      repairCost: 0,
    }));

    // totalCosts = 10000 + 310 = 10310
    // grossProfit = 20000 - 10310 = 9690
    // incomeTax = 9690 * 0.19 = 1841.10
    // netProfit = 9690 - 1841.10 = 7848.90
    // roi = 7848.90 / 10310 * 100 = 76.13 (approx)
    expect(result.roi).toBeCloseTo(76.13, 1);
    expect(result.profitabilityDecision).toBe('PROFITABLE');
  });

  // ── Edge cases ─────────────────────────────────────────────────

  it('engineCapacity null: uses small engine rate', () => {
    const result = calculateProfitability(makeInput({
      engineCapacity: null,
      purchasePrice: 10000,
      purchaseCurrency: 'PLN',
      sourceRegion: 'EU',
      transportCost: 0,
      registrationCost: 0,
      translationCost: 0,
      inspectionCost: 0,
      appraiserCost: 0,
      repairCost: 0,
    }));
    // 10000 * 0.031 = 310
    expect(result.exciseDuty).toBe(310);
  });

  it('purchasePrice = 0: totalCosts = fixedCosts only', () => {
    const result = calculateProfitability(makeInput({
      purchasePrice: 0,
      purchaseCurrency: 'PLN',
      sourceRegion: 'EU',
      transportCost: 1000,
      registrationCost: 0,
      translationCost: 0,
      inspectionCost: 0,
      appraiserCost: 0,
      repairCost: 0,
    }));
    expect(result.basePricePLN).toBe(0);
    expect(result.exciseDuty).toBe(0);
    expect(result.totalCosts).toBe(1000);
  });

  it('desiredROI = 0: maxBuyPrice equals break-even price', () => {
    const input = makeInput({
      purchasePrice: 0,
      purchaseCurrency: 'PLN',
      sourceRegion: 'EU',
      avgMarketPrice: 50000,
      engineCapacity: 1.6,
      transportCost: 0,
      registrationCost: 0,
      translationCost: 0,
      inspectionCost: 0,
      appraiserCost: 0,
      repairCost: 0,
      settings: { ...defaultSettings, desiredROI: 0 },
    });

    const result = calculateProfitability(input);

    // With desiredROI = 0, netProfit must be >= 0
    // netMultiplier = 1 + 0/(1-0.19) = 1
    // maxTotalCost = 50000 / 1 = 50000
    // maxBasePricePLN = (50000 - 0) / (1 + 0.031) = 50000 / 1.031 ≈ 48496.61
    // But then incomeTax reduces this... let's verify the formula
    // Actually with ROI=0, the formula says: maxTotalCost = avgMarketPrice / (1 + 0 / (1 - 0.19))
    // = avgMarketPrice / 1 = 50000
    // But we want netProfit = 0 at this maxTotalCost
    // grossProfit = 50000 - 50000 = 0, incomeTax = 0, netProfit = 0 ✓
    // maxBasePricePLN = (50000 - 0) / 1.031 ≈ 48496.61
    expect(result.maxBuyPricePLN).toBeCloseTo(48496.61, 0);
  });
});

describe('calculateMaxBuyPrice', () => {
  it('reverse calculation for EU', () => {
    const input = makeInput({
      sourceRegion: 'EU',
      purchaseCurrency: 'EUR',
      avgMarketPrice: 60000,
      engineCapacity: 1.6,
      transportCost: 2000,
      registrationCost: 500,
      translationCost: 200,
      inspectionCost: 100,
      appraiserCost: 300,
      repairCost: 0,
      settings: { ...defaultSettings, desiredROI: 10 },
    });

    const maxPLN = calculateMaxBuyPrice(input);

    // Verify: if we set purchasePrice to maxPLN and calculate, ROI should be ~10%
    const verifyInput = makeInput({
      ...input,
      purchasePrice: maxPLN,
      purchaseCurrency: 'PLN',
    });
    const verify = calculateProfitability(verifyInput);
    expect(verify.roi).toBeCloseTo(10, 0);
  });

  it('reverse calculation for NON_EU', () => {
    const input = makeInput({
      sourceRegion: 'NON_EU',
      purchaseCurrency: 'EUR',
      avgMarketPrice: 60000,
      engineCapacity: 1.6,
      transportCost: 2000,
      registrationCost: 500,
      translationCost: 200,
      inspectionCost: 100,
      appraiserCost: 300,
      repairCost: 0,
      settings: { ...defaultSettings, desiredROI: 10 },
    });

    const maxPLN = calculateMaxBuyPrice(input);

    const verifyInput = makeInput({
      ...input,
      purchasePrice: maxPLN,
      purchaseCurrency: 'PLN',
    });
    const verify = calculateProfitability(verifyInput);
    expect(verify.roi).toBeCloseTo(10, 0);
  });

  it('returns 0 when avgMarketPrice is null', () => {
    const input = makeInput({ avgMarketPrice: null });
    expect(calculateMaxBuyPrice(input)).toBe(0);
  });

  it('returns 0 when avgMarketPrice is 0', () => {
    const input = makeInput({ avgMarketPrice: 0 });
    expect(calculateMaxBuyPrice(input)).toBe(0);
  });

  it('maxBuyPrice shown in original currency for EUR', () => {
    const result = calculateProfitability(makeInput({
      sourceRegion: 'EU',
      purchaseCurrency: 'EUR',
      avgMarketPrice: 60000,
      settings: { ...defaultSettings, exchangeRateEUR: 4.30 },
    }));

    // maxBuyPriceOriginalCurrency = maxBuyPricePLN / 4.30
    expect(result.maxBuyPriceOriginalCurrency).toBeCloseTo(result.maxBuyPricePLN / 4.30, 0);
  });
});
