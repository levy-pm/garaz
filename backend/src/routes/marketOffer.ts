import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { prisma } from '../index';
import { validate } from '../middleware/validate';

const router = Router();

const currentYear = new Date().getFullYear();

const offerValidation = [
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
    if (req.query.checkedVehicleId) {
      where.checkedVehicleId = Number(req.query.checkedVehicleId);
    }

    const [items, total] = await Promise.all([
      prisma.marketOffer.findMany({
        where,
        include: { checkedVehicle: true },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.marketOffer.count({ where }),
    ]);

    res.json({ items, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// GET ONE
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const offer = await prisma.marketOffer.findUnique({
      where: { id: Number(req.params.id) },
      include: { checkedVehicle: true },
    });
    if (!offer) return res.status(404).json({ error: 'Nie znaleziono' });
    res.json(offer);
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// CREATE
router.post('/', offerValidation, validate, async (req: Request, res: Response) => {
  try {
    const offer = await prisma.marketOffer.create({
      data: req.body,
      include: { checkedVehicle: true },
    });
    res.status(201).json(offer);
  } catch (err) {
    res.status(500).json({ error: 'Błąd tworzenia oferty' });
  }
});

// UPDATE
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const offer = await prisma.marketOffer.update({
      where: { id: Number(req.params.id) },
      data: req.body,
      include: { checkedVehicle: true },
    });
    res.json(offer);
  } catch (err) {
    res.status(500).json({ error: 'Błąd aktualizacji' });
  }
});

// HARD DELETE
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.marketOffer.delete({
      where: { id: Number(req.params.id) },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Błąd usuwania' });
  }
});

export default router;
