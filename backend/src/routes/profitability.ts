import { Router, Request, Response } from 'express';
import { prisma } from '../index';

const router = Router();

// Calculate profitability for a vehicle (purchase or auction)
router.post('/calculate', async (req: Request, res: Response) => {
  try {
    const {
      vehicleId,
      type, // 'purchase' or 'auction'
      purchasePrice,
      purchaseCurrency, // PLN, USD, EUR
      isImport, // true if from abroad
    } = req.body;

    // Get settings
    let settings = await prisma.settings.findFirst({ where: { isArchived: false } });
    if (!settings) {
      settings = await prisma.settings.create({ data: {} });
    }

    // Get vehicle data
    const vehicle = await prisma.checkedVehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) return res.status(404).json({ error: 'Nie znaleziono pojazdu' });

    // Get market stats for average selling price
    const offers = await prisma.marketOffer.findMany({
      where: {
        isArchived: false,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
      },
    });

    const prices = offers.filter(o => o.pricePLN != null).map(o => o.pricePLN!);
    const avgMarketPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null;

    if (avgMarketPrice === null) {
      return res.status(400).json({ error: 'Brak danych rynkowych do kalkulacji' });
    }

    // Calculate all costs
    let basePricePLN = purchasePrice;
    // Currency conversion would use real rates in production; for now accept PLN
    // If needed, front-end sends pricePLN

    let totalCosts = basePricePLN;
    const breakdown: Record<string, number> = { basePricePLN };

    if (isImport) {
      const customsDuty = basePricePLN * (settings.customsDuty / 100);
      breakdown.customsDuty = customsDuty;
      totalCosts += customsDuty;

      const engineCapacity = vehicle.engineCapacity || 0;
      const exciseRate = engineCapacity > 2.0 ? settings.exciseDutyLarge : settings.exciseDutySmall;
      const exciseDuty = basePricePLN * (exciseRate / 100);
      breakdown.exciseDuty = exciseDuty;
      totalCosts += exciseDuty;

      const vat = (basePricePLN + customsDuty + exciseDuty) * (settings.vat / 100);
      breakdown.vat = vat;
      totalCosts += vat;
    }

    breakdown.transportCost = settings.transportCost;
    totalCosts += settings.transportCost;

    breakdown.registrationCost = settings.registrationCost;
    totalCosts += settings.registrationCost;

    breakdown.expertCost = settings.expertCost;
    totalCosts += settings.expertCost;

    if (vehicle.damaged) {
      breakdown.repairCost = settings.estimatedRepairCost;
      totalCosts += settings.estimatedRepairCost;
    }

    const incomeTax = (avgMarketPrice - totalCosts) > 0
      ? (avgMarketPrice - totalCosts) * (settings.incomeTax / 100)
      : 0;
    breakdown.incomeTax = incomeTax;

    const desiredMargin = settings.desiredMargin;
    breakdown.desiredMargin = desiredMargin;

    const totalWithTaxAndMargin = totalCosts + incomeTax + desiredMargin;

    // Max buy/bid price = avgMarketPrice - all costs except base price
    const costsWithoutBase = totalCosts - basePricePLN;
    const maxPrice = avgMarketPrice - costsWithoutBase - incomeTax - desiredMargin;

    const profit = avgMarketPrice - totalWithTaxAndMargin;

    res.json({
      type,
      avgMarketPrice: Math.round(avgMarketPrice),
      purchasePrice: basePricePLN,
      totalCosts: Math.round(totalCosts),
      breakdown: Object.fromEntries(
        Object.entries(breakdown).map(([k, v]) => [k, Math.round(v)])
      ),
      incomeTax: Math.round(incomeTax),
      desiredMargin: Math.round(desiredMargin),
      totalWithTaxAndMargin: Math.round(totalWithTaxAndMargin),
      maxBuyPrice: Math.round(Math.max(0, maxPrice)),
      estimatedProfit: Math.round(profit),
      profitable: profit > 0,
    });
  } catch (err) {
    res.status(500).json({ error: 'Błąd kalkulacji' });
  }
});

export default router;
