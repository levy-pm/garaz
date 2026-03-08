import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { prisma } from '../index';
import { validate } from '../middleware/validate';

const router = Router();

const offerValidation = [
  body('targetCarId').isInt().withMessage('ID auta docelowego jest wymagane'),
  body('source').notEmpty().withMessage('Źródło oferty jest wymagane'),
  body('price').isFloat({ min: 0 }).withMessage('Cena musi być liczbą dodatnią'),
];

// LIST (optionally filter by targetCarId)
router.get('/', async (req: Request, res: Response) => {
  const where: any = { isArchived: false };
  if (req.query.targetCarId) where.targetCarId = Number(req.query.targetCarId);
  const offers = await prisma.comparisonOffer.findMany({
    where,
    include: { targetCar: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(offers);
});

// GET ONE
router.get('/:id', async (req: Request, res: Response) => {
  const offer = await prisma.comparisonOffer.findUnique({
    where: { id: Number(req.params.id) },
    include: { targetCar: true },
  });
  if (!offer) return res.status(404).json({ error: 'Nie znaleziono' });
  res.json(offer);
});

// CREATE
router.post('/', offerValidation, validate, async (req: Request, res: Response) => {
  const offer = await prisma.comparisonOffer.create({
    data: req.body,
    include: { targetCar: true },
  });
  res.status(201).json(offer);
});

// UPDATE
router.put('/:id', async (req: Request, res: Response) => {
  const offer = await prisma.comparisonOffer.update({
    where: { id: Number(req.params.id) },
    data: req.body,
    include: { targetCar: true },
  });
  res.json(offer);
});

// SOFT DELETE
router.delete('/:id', async (req: Request, res: Response) => {
  const offer = await prisma.comparisonOffer.update({
    where: { id: Number(req.params.id) },
    data: { isArchived: true },
  });
  res.json(offer);
});

export default router;
