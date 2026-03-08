import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { prisma } from '../index';
import { validate } from '../middleware/validate';

const router = Router();

const engineNoteValidation = [
  body('engineCode').notEmpty().withMessage('Kod silnika jest wymagany'),
];

// LIST
router.get('/', async (_req: Request, res: Response) => {
  const notes = await prisma.engineNote.findMany({
    where: { isArchived: false },
    orderBy: { createdAt: 'desc' },
  });
  res.json(notes);
});

// GET ONE
router.get('/:id', async (req: Request, res: Response) => {
  const note = await prisma.engineNote.findUnique({
    where: { id: Number(req.params.id) },
  });
  if (!note) return res.status(404).json({ error: 'Nie znaleziono' });
  res.json(note);
});

// CREATE
router.post('/', engineNoteValidation, validate, async (req: Request, res: Response) => {
  const note = await prisma.engineNote.create({ data: req.body });
  res.status(201).json(note);
});

// UPDATE
router.put('/:id', async (req: Request, res: Response) => {
  const note = await prisma.engineNote.update({
    where: { id: Number(req.params.id) },
    data: req.body,
  });
  res.json(note);
});

// SOFT DELETE
router.delete('/:id', async (req: Request, res: Response) => {
  const note = await prisma.engineNote.update({
    where: { id: Number(req.params.id) },
    data: { isArchived: true },
  });
  res.json(note);
});

export default router;
