import { Router, Request, Response } from 'express';
import { prisma } from '../index';

const router = Router();

const ALLOWED_FIELDS = [
  'exciseDutySmall',
  'exciseDutyLarge',
  'customsDuty',
  'incomeTax',
  'vat',
  'estimatedRepairCost',
  'desiredMargin',
  'transportCost',
  'registrationCost',
  'expertCost',
  'translationCost',
  'inspectionCost',
  'exchangeRateEUR',
  'exchangeRateUSD',
  'desiredROI',
  'accidentDiscountPercent',
] as const;

function pickAllowed(body: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in body) {
      result[key] = body[key];
    }
  }
  return result;
}

// GET settings (return first non-archived or create default)
router.get('/', async (_req: Request, res: Response) => {
  try {
    let settings = await prisma.settings.findFirst({
      where: { isArchived: false },
    });
    if (!settings) {
      settings = await prisma.settings.create({ data: {} });
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// UPDATE settings
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const data = pickAllowed(req.body);
    const settings = await prisma.settings.update({
      where: { id: Number(req.params.id) },
      data,
    });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Błąd aktualizacji ustawień' });
  }
});

export default router;
