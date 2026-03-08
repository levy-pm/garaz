import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { prisma } from '../index';
import { validate } from '../middleware/validate';

const router = Router();

const targetCarValidation = [
  body('make').notEmpty().withMessage('Marka jest wymagana'),
  body('model').notEmpty().withMessage('Model jest wymagany'),
  body('year').isInt({ min: 1900, max: 2030 }).withMessage('Rok musi być między 1900 a 2030'),
];

// LIST
router.get('/', async (_req: Request, res: Response) => {
  const cars = await prisma.targetCar.findMany({
    where: { isArchived: false },
    include: { offers: { where: { isArchived: false } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(cars);
});

// GET ONE
router.get('/:id', async (req: Request, res: Response) => {
  const car = await prisma.targetCar.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      offers: { where: { isArchived: false } },
      valuationCalcs: { where: { isArchived: false } },
      auctionCalcs: { where: { isArchived: false } },
    },
  });
  if (!car) return res.status(404).json({ error: 'Nie znaleziono' });
  res.json(car);
});

// CREATE
router.post('/', targetCarValidation, validate, async (req: Request, res: Response) => {
  const car = await prisma.targetCar.create({ data: req.body });
  res.status(201).json(car);
});

// UPDATE
router.put('/:id', targetCarValidation, validate, async (req: Request, res: Response) => {
  const car = await prisma.targetCar.update({
    where: { id: Number(req.params.id) },
    data: req.body,
  });
  res.json(car);
});

// SOFT DELETE (archive)
router.delete('/:id', async (req: Request, res: Response) => {
  const car = await prisma.targetCar.update({
    where: { id: Number(req.params.id) },
    data: { isArchived: true },
  });
  res.json(car);
});

export default router;
