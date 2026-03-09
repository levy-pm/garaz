import { Router, Request, Response } from 'express';
import { prisma } from '../index';

const router = Router();

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
    const settings = await prisma.settings.update({
      where: { id: Number(req.params.id) },
      data: req.body,
    });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Błąd aktualizacji ustawień' });
  }
});

export default router;
