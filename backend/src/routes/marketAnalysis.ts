import { Router, Request, Response } from 'express';
import { prisma } from '../index';

const router = Router();

// GET market analysis data for a vehicle over a date range
router.get('/', async (req: Request, res: Response) => {
  try {
    const vehicleId = Number(req.query.vehicleId);
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;

    if (!vehicleId) return res.status(400).json({ error: 'vehicleId jest wymagane' });

    const vehicle = await prisma.checkedVehicle.findUnique({
      where: { id: vehicleId },
    });
    if (!vehicle) return res.status(404).json({ error: 'Nie znaleziono pojazdu' });

    const where: any = {
      isArchived: false,
      make: vehicle.make,
      model: vehicle.model,
    };

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo + 'T23:59:59.999Z');
    }

    const offers = await prisma.marketOffer.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    // Group by month for trend analysis
    const monthlyData: Record<string, { prices: number[]; mileages: number[]; accidentFree: number; total: number }> = {};

    for (const offer of offers) {
      const monthKey = offer.createdAt.toISOString().slice(0, 7); // YYYY-MM
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { prices: [], mileages: [], accidentFree: 0, total: 0 };
      }
      if (offer.pricePLN != null) monthlyData[monthKey].prices.push(offer.pricePLN);
      if (offer.mileageKm != null) monthlyData[monthKey].mileages.push(offer.mileageKm);
      if (offer.accidentFree) monthlyData[monthKey].accidentFree++;
      monthlyData[monthKey].total++;
    }

    const avg = (nums: number[]) => nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;

    const trends = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        avgPrice: avg(data.prices),
        avgMileage: avg(data.mileages),
        accidentFreeRate: data.total > 0 ? (data.accidentFree / data.total) * 100 : null,
        offerCount: data.total,
      }));

    res.json({
      vehicle: { id: vehicle.id, make: vehicle.make, model: vehicle.model, year: vehicle.year },
      trends,
      totalOffers: offers.length,
    });
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

export default router;
