import { Router } from 'express';
import { prisma } from '../index';

const router = Router();

// GET /api/catalog/makes
router.get('/makes', async (_req, res) => {
  try {
    const makes = await prisma.catalogMake.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
    res.json(makes);
  } catch (err) {
    res.status(500).json({ error: 'Nie udało się pobrać marek' });
  }
});

// GET /api/catalog/models?makeId=...
router.get('/models', async (req, res) => {
  const makeId = Number(req.query.makeId);
  if (!makeId) {
    return res.status(400).json({ error: 'Parametr makeId jest wymagany' });
  }

  try {
    const models = await prisma.catalogModel.findMany({
      where: { makeId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
    res.json(models);
  } catch (err) {
    res.status(500).json({ error: 'Nie udało się pobrać modeli' });
  }
});

export default router;
