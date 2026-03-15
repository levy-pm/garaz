import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { prisma } from '../index';
import { validate } from '../middleware/validate';

const router = Router();

const currentYear = new Date().getFullYear();

const allowedFields = [
  'vehicleType', 'make', 'model', 'year', 'version', 'equipmentVersion',
  'bodyType', 'fuelType', 'color', 'transmission', 'driveType',
  'engineCode', 'engineFamily', 'engineCapacity',
  'horsepowerKM', 'horsepowerKW', 'torque',
  'pricePLN', 'priceUSD', 'priceEUR', 'currency',
  'mileageKm', 'mileageMi',
  'accidentFree', 'accidentCount', 'damaged', 'damageDescription',
  'continent', 'country', 'notes', 'isArchived',
];

function pickAllowed(body: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key of allowedFields) {
    if (key in body) result[key] = body[key];
  }
  return result;
}

const vehicleValidation = [
  body('vehicleType').notEmpty().withMessage('Typ pojazdu jest wymagany'),
  body('make').notEmpty().withMessage('Marka jest wymagana'),
  body('model').notEmpty().withMessage('Model jest wymagany'),
  body('year').isInt({ min: 1900, max: currentYear }).withMessage(`Rok musi być między 1900 a ${currentYear}`),
];

// LIST with pagination, search, sort
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const search = (req.query.search as string) || '';
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc';

    const where: any = { isArchived: false };
    if (search) {
      where.OR = [
        { make: { contains: search } },
        { model: { contains: search } },
        { notes: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.checkedVehicle.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.checkedVehicle.count({ where }),
    ]);

    res.json({ items, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// GET ONE
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const vehicle = await prisma.checkedVehicle.findUnique({
      where: { id: Number(req.params.id) },
      include: { marketOffers: { where: { isArchived: false } } },
    });
    if (!vehicle) return res.status(404).json({ error: 'Nie znaleziono' });
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// MARKET STATS for a vehicle (average price, avg mileage from MarketOffers matching make+model+year)
router.get('/:id/market-stats', async (req: Request, res: Response) => {
  try {
    const vehicle = await prisma.checkedVehicle.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!vehicle) return res.status(404).json({ error: 'Nie znaleziono' });

    const offers = await prisma.marketOffer.findMany({
      where: {
        isArchived: false,
        make: vehicle.make,
        model: vehicle.model,
      },
    });

    // Filter offers for same year for year-specific stats
    const sameYearOffers = offers.filter(o => o.year === vehicle.year);
    const allModelOffers = offers;

    const calcStats = (arr: any[]) => {
      const prices = arr.filter(o => o.pricePLN != null).map(o => o.pricePLN!);
      const mileages = arr.filter(o => o.mileageKm != null).map(o => o.mileageKm!);

      const avg = (nums: number[]) => nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
      const median = (nums: number[]) => {
        if (!nums.length) return null;
        const sorted = [...nums].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      };

      return {
        count: arr.length,
        avgPrice: avg(prices),
        medianPrice: median(prices),
        avgMileage: avg(mileages),
        medianMileage: median(mileages),
      };
    };

    const yearStats = calcStats(sameYearOffers);
    const modelStats = calcStats(allModelOffers);

    // Proposed price calculation (deterministic)
    let proposedPrice: number | null = null;
    if (yearStats.medianPrice != null && yearStats.avgPrice != null && modelStats.avgPrice != null) {
      const vehicleMileage = vehicle.mileageKm || 0;
      const medianMileage = yearStats.medianMileage || vehicleMileage;

      // Base price: weighted average of year median, year avg, and model avg
      const basePrice = (yearStats.medianPrice * 0.4) + (yearStats.avgPrice * 0.3) + (modelStats.avgPrice * 0.3);

      // Mileage adjustment: if vehicle has more km than median, reduce price proportionally
      let mileageAdjustment = 1;
      if (medianMileage > 0) {
        const mileageDiff = (vehicleMileage - medianMileage) / medianMileage;
        mileageAdjustment = 1 - (mileageDiff * 0.15); // 15% price change per 100% mileage difference
      }

      proposedPrice = Math.round(basePrice * mileageAdjustment);
    }

    // Accident discount on proposedPrice
    let settings = await prisma.settings.findFirst({ where: { isArchived: false } });
    if (!settings) {
      settings = await prisma.settings.create({ data: {} });
    }

    let proposedPriceAdjusted = proposedPrice;
    let accidentDiscount = 0;
    if (proposedPrice !== null && !vehicle.accidentFree && vehicle.accidentCount > 0) {
      const rate = (settings.accidentDiscountPercent / 100) * vehicle.accidentCount;
      const cappedRate = Math.min(rate, 1);
      accidentDiscount = Math.round(cappedRate * 100);
      proposedPriceAdjusted = Math.round(proposedPrice * (1 - cappedRate));
    }

    res.json({
      yearStats,
      modelStats,
      proposedPrice,
      proposedPriceAdjusted,
      accidentDiscount,
      accidentCount: vehicle.accidentCount,
    });
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// CREATE
router.post('/', vehicleValidation, validate, async (req: Request, res: Response) => {
  try {
    const vehicle = await prisma.checkedVehicle.create({ data: pickAllowed(req.body) as any });
    res.status(201).json(vehicle);
  } catch (err) {
    res.status(500).json({ error: 'Błąd tworzenia pojazdu' });
  }
});

// UPDATE
router.put('/:id', vehicleValidation, validate, async (req: Request, res: Response) => {
  try {
    const vehicle = await prisma.checkedVehicle.update({
      where: { id: Number(req.params.id) },
      data: pickAllowed(req.body),
    });
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ error: 'Błąd aktualizacji' });
  }
});

// HARD DELETE
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.checkedVehicle.delete({
      where: { id: Number(req.params.id) },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Błąd usuwania' });
  }
});

export default router;
