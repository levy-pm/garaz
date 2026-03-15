import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { prisma } from '../index';
import { validate } from '../middleware/validate';
import {
  calculateProfitability,
  type CalcInput,
  type CalcSettings,
} from '../services/profitability.service';

const router = Router();

interface VehicleComparison {
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

const comparisonValidation = [
  body('vehicleIds')
    .isArray({ min: 2, max: 3 })
    .withMessage('Wybierz 2 lub 3 pojazdy do porównania'),
  body('vehicleIds.*')
    .isInt({ min: 1 })
    .withMessage('Nieprawidłowe ID pojazdu'),
];

router.post('/', comparisonValidation, validate, async (req: Request, res: Response) => {
  try {
    const { vehicleIds } = req.body as { vehicleIds: number[] };

    // Fetch settings
    let settings = await prisma.settings.findFirst({ where: { isArchived: false } });
    if (!settings) {
      settings = await prisma.settings.create({ data: {} });
    }

    const calcSettings: CalcSettings = {
      exciseDutySmall: settings.exciseDutySmall,
      exciseDutyLarge: settings.exciseDutyLarge,
      customsDuty: settings.customsDuty,
      incomeTax: settings.incomeTax,
      vat: settings.vat,
      exchangeRateEUR: settings.exchangeRateEUR,
      exchangeRateUSD: settings.exchangeRateUSD,
      desiredROI: settings.desiredROI,
    };

    const comparisons: VehicleComparison[] = [];

    for (const vehicleId of vehicleIds) {
      const vehicle = await prisma.checkedVehicle.findUnique({
        where: { id: vehicleId },
      });

      if (!vehicle) {
        return res.status(404).json({ error: `Nie znaleziono pojazdu o ID ${vehicleId}` });
      }

      // Market data
      const offers = await prisma.marketOffer.findMany({
        where: {
          isArchived: false,
          make: vehicle.make,
          model: vehicle.model,
        },
      });

      const sameYearOffers = offers.filter(o => o.year === vehicle.year);
      const allOffers = offers;

      const prices = sameYearOffers.filter(o => o.pricePLN != null && o.pricePLN > 0).map(o => o.pricePLN!);
      const mileages = sameYearOffers.filter(o => o.mileageKm != null).map(o => o.mileageKm!);

      const avg = (nums: number[]) => nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
      const median = (nums: number[]) => {
        if (!nums.length) return null;
        const sorted = [...nums].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      };

      const avgPrice = avg(prices);
      const medianPrice = median(prices);
      const minPrice = prices.length ? Math.min(...prices) : null;
      const maxPrice = prices.length ? Math.max(...prices) : null;
      const avgMileage = avg(mileages);

      // ProposedPrice calculation (same logic as market-stats endpoint)
      const yearStats = {
        avgPrice: avg(prices),
        medianPrice: median(prices),
        medianMileage: median(mileages),
      };
      const allPrices = allOffers.filter(o => o.pricePLN != null && o.pricePLN > 0).map(o => o.pricePLN!);
      const modelAvgPrice = avg(allPrices);

      let proposedPrice: number | null = null;
      if (yearStats.medianPrice != null && yearStats.avgPrice != null && modelAvgPrice != null) {
        const vehicleMileage = vehicle.mileageKm || 0;
        const medMileage = yearStats.medianMileage || vehicleMileage;
        const basePrice = (yearStats.medianPrice * 0.4) + (yearStats.avgPrice * 0.3) + (modelAvgPrice * 0.3);
        let mileageAdj = 1;
        if (medMileage > 0) {
          mileageAdj = 1 - ((vehicleMileage - medMileage) / medMileage * 0.15);
        }
        proposedPrice = Math.round(basePrice * mileageAdj);
      }

      // Accident discount on proposedPrice
      let proposedPriceAdjusted = proposedPrice;
      let accidentDiscount = 0;
      if (proposedPrice !== null && !vehicle.accidentFree && vehicle.accidentCount > 0) {
        const rate = (settings.accidentDiscountPercent / 100) * vehicle.accidentCount;
        const cappedRate = Math.min(rate, 1);
        accidentDiscount = Math.round(cappedRate * 100);
        proposedPriceAdjusted = Math.round(proposedPrice * (1 - cappedRate));
      }

      // Profitability (use vehicle's own price as purchase price if available)
      let profitability: VehicleComparison['profitability'] = null;
      const purchasePrice = vehicle.pricePLN || vehicle.priceEUR || vehicle.priceUSD || 0;
      const purchaseCurrency = vehicle.pricePLN ? 'PLN' as const :
        vehicle.priceEUR ? 'EUR' as const : 'USD' as const;

      if (purchasePrice > 0 && avgPrice !== null) {
        const calcInput: CalcInput = {
          purchasePrice,
          purchaseCurrency,
          sourceRegion: (vehicle.continent === 'Europa' || vehicle.country === 'Polska') ? 'EU' : 'NON_EU',
          isNetto: false,
          mode: 'BUY_NOW',
          engineCapacity: vehicle.engineCapacity,
          avgMarketPrice: avgPrice,
          medianMarketPrice: medianPrice,
          transportCost: settings.transportCost,
          registrationCost: settings.registrationCost,
          translationCost: settings.translationCost,
          inspectionCost: settings.inspectionCost,
          appraiserCost: settings.expertCost,
          repairCost: vehicle.damaged ? settings.estimatedRepairCost : 0,
          settings: calcSettings,
        };

        const result = calculateProfitability(calcInput);
        profitability = {
          totalCosts: result.totalCosts,
          grossProfit: result.grossProfit,
          netProfit: result.netProfit,
          roi: result.roi,
          maxBuyPricePLN: result.maxBuyPricePLN,
          profitabilityDecision: result.profitabilityDecision,
        };
      }

      // Get equipment from linked market offers
      const equipmentTexts = offers
        .filter(o => o.equipment && o.equipment.trim())
        .map(o => o.equipment!.trim());
      const equipmentStr = equipmentTexts.length > 0 ? equipmentTexts[0] : null;

      comparisons.push({
        vehicle: {
          id: vehicle.id,
          vehicleType: vehicle.vehicleType,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          version: vehicle.version,
          equipmentVersion: vehicle.equipmentVersion,
          bodyType: vehicle.bodyType,
          fuelType: vehicle.fuelType,
          color: vehicle.color,
          transmission: vehicle.transmission,
          driveType: vehicle.driveType,
          engineCapacity: vehicle.engineCapacity,
          horsepowerKM: vehicle.horsepowerKM,
          horsepowerKW: vehicle.horsepowerKW,
          torque: vehicle.torque,
          pricePLN: vehicle.pricePLN,
          priceEUR: vehicle.priceEUR,
          priceUSD: vehicle.priceUSD,
          currency: vehicle.currency,
          mileageKm: vehicle.mileageKm,
          mileageMi: vehicle.mileageMi,
          accidentFree: vehicle.accidentFree,
          accidentCount: vehicle.accidentCount,
          damaged: vehicle.damaged,
          continent: vehicle.continent,
          country: vehicle.country,
          notes: vehicle.notes,
          equipment: equipmentStr,
        },
        marketData: {
          offerCount: sameYearOffers.length,
          avgPrice: avgPrice !== null ? Math.round(avgPrice) : null,
          medianPrice: medianPrice !== null ? Math.round(medianPrice) : null,
          minPrice,
          maxPrice,
          avgMileage: avgMileage !== null ? Math.round(avgMileage) : null,
          proposedPrice,
          proposedPriceAdjusted,
          accidentDiscount,
        },
        profitability,
      });
    }

    res.json({ comparisons, settings: { accidentDiscountPercent: settings.accidentDiscountPercent } });
  } catch (err) {
    console.error('Comparison error:', err);
    res.status(500).json({ error: 'Błąd porównania pojazdów' });
  }
});

export default router;
