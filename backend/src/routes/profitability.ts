import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { prisma } from '../index';
import { validate } from '../middleware/validate';
import {
  calculateProfitability,
  type CalcInput,
  type PurchaseCurrency,
  type SourceRegion,
  type CalcMode,
} from '../services/profitability.service';

const router = Router();

const calculateValidation = [
  body('vehicleId').isInt({ min: 1 }).withMessage('vehicleId musi być liczbą całkowitą > 0'),
  body('purchasePrice').isFloat({ min: 0 }).withMessage('purchasePrice musi być liczbą >= 0'),
  body('purchaseCurrency').isIn(['PLN', 'EUR', 'USD']).withMessage('purchaseCurrency musi być PLN, EUR lub USD'),
  body('sourceRegion').isIn(['EU', 'NON_EU']).withMessage('sourceRegion musi być EU lub NON_EU'),
  body('isNetto').isBoolean().withMessage('isNetto musi być wartością boolean'),
  body('mode').isIn(['AUCTION', 'BUY_NOW', 'MAX_BID']).withMessage('mode musi być AUCTION, BUY_NOW lub MAX_BID'),
  body('transportCost').optional().isFloat({ min: 0 }).withMessage('transportCost musi być >= 0'),
  body('registrationCost').optional().isFloat({ min: 0 }).withMessage('registrationCost musi być >= 0'),
  body('translationCost').optional().isFloat({ min: 0 }).withMessage('translationCost musi być >= 0'),
  body('inspectionCost').optional().isFloat({ min: 0 }).withMessage('inspectionCost musi być >= 0'),
  body('appraiserCost').optional().isFloat({ min: 0 }).withMessage('appraiserCost musi być >= 0'),
  body('repairCost').optional().isFloat({ min: 0 }).withMessage('repairCost musi być >= 0'),
];

router.post('/calculate', calculateValidation, validate, async (req: Request, res: Response) => {
  try {
    const {
      vehicleId,
      purchasePrice,
      purchaseCurrency,
      sourceRegion,
      isNetto,
      mode,
      transportCost,
      registrationCost,
      translationCost,
      inspectionCost,
      appraiserCost,
      repairCost,
    } = req.body;

    // Fetch settings
    let settings = await prisma.settings.findFirst({ where: { isArchived: false } });
    if (!settings) {
      settings = await prisma.settings.create({ data: {} });
    }

    // Fetch vehicle
    const vehicle = await prisma.checkedVehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      return res.status(404).json({ error: 'Nie znaleziono pojazdu' });
    }

    // Fetch market offers for avgMarketPrice and medianMarketPrice
    const offers = await prisma.marketOffer.findMany({
      where: {
        isArchived: false,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
      },
    });

    const prices = offers
      .filter(o => o.pricePLN != null && o.pricePLN > 0)
      .map(o => o.pricePLN!);

    let avgMarketPrice: number | null = null;
    let medianMarketPrice: number | null = null;

    if (prices.length > 0) {
      avgMarketPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

      const sorted = [...prices].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      medianMarketPrice = sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
    }

    // Build calculation input
    const calcInput: CalcInput = {
      purchasePrice: Number(purchasePrice),
      purchaseCurrency: purchaseCurrency as PurchaseCurrency,
      sourceRegion: sourceRegion as SourceRegion,
      isNetto: Boolean(isNetto),
      mode: mode as CalcMode,
      engineCapacity: vehicle.engineCapacity,
      avgMarketPrice,
      medianMarketPrice,
      transportCost: transportCost ?? settings.transportCost,
      registrationCost: registrationCost ?? settings.registrationCost,
      translationCost: translationCost ?? settings.translationCost,
      inspectionCost: inspectionCost ?? settings.inspectionCost,
      appraiserCost: appraiserCost ?? settings.expertCost,
      repairCost: repairCost ?? (vehicle.damaged ? settings.estimatedRepairCost : 0),
      settings: {
        exciseDutySmall: settings.exciseDutySmall,
        exciseDutyLarge: settings.exciseDutyLarge,
        customsDuty: settings.customsDuty,
        incomeTax: settings.incomeTax,
        vat: settings.vat,
        exchangeRateEUR: settings.exchangeRateEUR,
        exchangeRateUSD: settings.exchangeRateUSD,
        desiredROI: settings.desiredROI,
      },
    };

    const result = calculateProfitability(calcInput);

    res.json({
      vehicle: {
        id: vehicle.id,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        engineCapacity: vehicle.engineCapacity,
      },
      ...result,
    });
  } catch (err) {
    console.error('Profitability calculation error:', err);
    res.status(500).json({ error: 'Błąd kalkulacji' });
  }
});

export default router;
