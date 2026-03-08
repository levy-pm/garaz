import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { prisma } from '../index';
import { validate } from '../middleware/validate';

const router = Router();

const costProfileValidation = [
  body('name').notEmpty().withMessage('Nazwa profilu jest wymagana'),
];

// LIST
router.get('/', async (_req: Request, res: Response) => {
  const profiles = await prisma.costProfile.findMany({
    where: { isArchived: false },
    orderBy: { createdAt: 'desc' },
  });
  res.json(profiles);
});

// GET ONE
router.get('/:id', async (req: Request, res: Response) => {
  const profile = await prisma.costProfile.findUnique({
    where: { id: Number(req.params.id) },
  });
  if (!profile) return res.status(404).json({ error: 'Nie znaleziono' });
  res.json(profile);
});

// CREATE
router.post('/', costProfileValidation, validate, async (req: Request, res: Response) => {
  // If setting as default, unset other defaults
  if (req.body.isDefault) {
    await prisma.costProfile.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });
  }
  const profile = await prisma.costProfile.create({ data: req.body });
  res.status(201).json(profile);
});

// UPDATE
router.put('/:id', async (req: Request, res: Response) => {
  if (req.body.isDefault) {
    await prisma.costProfile.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });
  }
  const profile = await prisma.costProfile.update({
    where: { id: Number(req.params.id) },
    data: req.body,
  });
  res.json(profile);
});

// SOFT DELETE
router.delete('/:id', async (req: Request, res: Response) => {
  const profile = await prisma.costProfile.update({
    where: { id: Number(req.params.id) },
    data: { isArchived: true },
  });
  res.json(profile);
});

export default router;
