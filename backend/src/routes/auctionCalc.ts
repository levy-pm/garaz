import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { prisma } from '../index';
import { validate } from '../middleware/validate';

const router = Router();

const auctionValidation = [
  body('name').notEmpty().withMessage('Nazwa kalkulacji jest wymagana'),
  body('startingPrice').isFloat({ min: 0 }).withMessage('Cena wywoławcza musi być liczbą dodatnią'),
  body('maxBid').isFloat({ min: 0 }).withMessage('Maksymalna oferta musi być liczbą dodatnią'),
];

// LIST
router.get('/', async (_req: Request, res: Response) => {
  const calcs = await prisma.auctionCalc.findMany({
    where: { isArchived: false },
    include: { targetCar: true, costProfile: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(calcs);
});

// GET ONE
router.get('/:id', async (req: Request, res: Response) => {
  const calc = await prisma.auctionCalc.findUnique({
    where: { id: Number(req.params.id) },
    include: { targetCar: true, costProfile: true },
  });
  if (!calc) return res.status(404).json({ error: 'Nie znaleziono' });
  res.json(calc);
});

// CREATE
router.post('/', auctionValidation, validate, async (req: Request, res: Response) => {
  const data = req.body;
  data.totalCost = (data.maxBid || 0) + (data.auctionFee || 0) + (data.buyerPremium || 0)
    + (data.transportCost || 0) + (data.repairEstimate || 0) + (data.otherCosts || 0);
  data.potentialProfit = (data.estimatedValue || 0) - data.totalCost;

  const calc = await prisma.auctionCalc.create({
    data,
    include: { targetCar: true, costProfile: true },
  });
  res.status(201).json(calc);
});

// UPDATE
router.put('/:id', async (req: Request, res: Response) => {
  const data = req.body;
  data.totalCost = (data.maxBid || 0) + (data.auctionFee || 0) + (data.buyerPremium || 0)
    + (data.transportCost || 0) + (data.repairEstimate || 0) + (data.otherCosts || 0);
  data.potentialProfit = (data.estimatedValue || 0) - data.totalCost;

  const calc = await prisma.auctionCalc.update({
    where: { id: Number(req.params.id) },
    data,
    include: { targetCar: true, costProfile: true },
  });
  res.json(calc);
});

// SOFT DELETE
router.delete('/:id', async (req: Request, res: Response) => {
  const calc = await prisma.auctionCalc.update({
    where: { id: Number(req.params.id) },
    data: { isArchived: true },
  });
  res.json(calc);
});

export default router;
