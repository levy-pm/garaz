import { describe, it, expect } from 'vitest';

/**
 * Accident discount calculation tests.
 * The logic is: proposedPrice * (1 - min(accidentDiscountPercent/100 * accidentCount, 1))
 */

interface AccidentDiscountInput {
  proposedPrice: number;
  accidentFree: boolean;
  accidentCount: number;
  accidentDiscountPercent: number;
}

function calculateAccidentDiscount(input: AccidentDiscountInput): {
  proposedPriceAdjusted: number;
  accidentDiscount: number;
} {
  if (input.accidentFree || input.accidentCount === 0 || input.proposedPrice <= 0) {
    return { proposedPriceAdjusted: input.proposedPrice, accidentDiscount: 0 };
  }

  const rate = (input.accidentDiscountPercent / 100) * input.accidentCount;
  const cappedRate = Math.min(rate, 1);
  const accidentDiscount = Math.round(cappedRate * 100);
  const proposedPriceAdjusted = Math.round(input.proposedPrice * (1 - cappedRate));

  return { proposedPriceAdjusted, accidentDiscount };
}

describe('accident discount', () => {
  it('accidentFree = true: no reduction', () => {
    const result = calculateAccidentDiscount({
      proposedPrice: 100000,
      accidentFree: true,
      accidentCount: 0,
      accidentDiscountPercent: 10,
    });

    expect(result.proposedPriceAdjusted).toBe(100000);
    expect(result.accidentDiscount).toBe(0);
  });

  it('accidentFree = false, 1 accident, 10% rate', () => {
    const result = calculateAccidentDiscount({
      proposedPrice: 100000,
      accidentFree: false,
      accidentCount: 1,
      accidentDiscountPercent: 10,
    });

    expect(result.proposedPriceAdjusted).toBe(90000);
    expect(result.accidentDiscount).toBe(10);
  });

  it('accidentFree = false, 2 accidents, 10% rate => 20% reduction', () => {
    const result = calculateAccidentDiscount({
      proposedPrice: 100000,
      accidentFree: false,
      accidentCount: 2,
      accidentDiscountPercent: 10,
    });

    expect(result.proposedPriceAdjusted).toBe(80000);
    expect(result.accidentDiscount).toBe(20);
  });

  it('accidentFree = false, 3 accidents, 15% rate => 45% reduction', () => {
    const result = calculateAccidentDiscount({
      proposedPrice: 100000,
      accidentFree: false,
      accidentCount: 3,
      accidentDiscountPercent: 15,
    });

    expect(result.proposedPriceAdjusted).toBe(55000);
    expect(result.accidentDiscount).toBe(45);
  });

  it('caps reduction at 100%', () => {
    const result = calculateAccidentDiscount({
      proposedPrice: 100000,
      accidentFree: false,
      accidentCount: 20,
      accidentDiscountPercent: 10,
    });

    // 10% * 20 = 200%, capped to 100%
    expect(result.proposedPriceAdjusted).toBe(0);
    expect(result.accidentDiscount).toBe(100);
  });

  it('caps reduction exactly at 100% boundary', () => {
    const result = calculateAccidentDiscount({
      proposedPrice: 100000,
      accidentFree: false,
      accidentCount: 10,
      accidentDiscountPercent: 10,
    });

    // 10% * 10 = 100%, exactly at cap
    expect(result.proposedPriceAdjusted).toBe(0);
    expect(result.accidentDiscount).toBe(100);
  });

  it('accidentCount = 0 with accidentFree = false: no reduction', () => {
    const result = calculateAccidentDiscount({
      proposedPrice: 100000,
      accidentFree: false,
      accidentCount: 0,
      accidentDiscountPercent: 10,
    });

    expect(result.proposedPriceAdjusted).toBe(100000);
    expect(result.accidentDiscount).toBe(0);
  });

  it('accidentDiscountPercent = 0: no reduction regardless of accidents', () => {
    const result = calculateAccidentDiscount({
      proposedPrice: 100000,
      accidentFree: false,
      accidentCount: 5,
      accidentDiscountPercent: 0,
    });

    expect(result.proposedPriceAdjusted).toBe(100000);
    expect(result.accidentDiscount).toBe(0);
  });

  it('handles fractional percentages', () => {
    const result = calculateAccidentDiscount({
      proposedPrice: 100000,
      accidentFree: false,
      accidentCount: 1,
      accidentDiscountPercent: 7.5,
    });

    // 7.5% * 1 = 7.5%, which rounds to 8% for display
    expect(result.proposedPriceAdjusted).toBe(92500);
    expect(result.accidentDiscount).toBe(8); // Math.round(7.5)
  });
});
