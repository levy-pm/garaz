import { Router } from 'express';
import { prisma } from '../index';

const router = Router();

// GET /api/catalog/makes — distinct makes from checked vehicles + market offers
router.get('/makes', async (_req, res) => {
  try {
    const [vehicleMakes, offerMakes] = await Promise.all([
      prisma.checkedVehicle.findMany({ select: { make: true }, distinct: ['make'], where: { make: { not: '' } } }),
      prisma.marketOffer.findMany({ select: { make: true }, distinct: ['make'], where: { make: { not: '' } } }),
    ]);
    const unique = [...new Set([
      ...vehicleMakes.map(v => v.make),
      ...offerMakes.map(o => o.make),
    ])].sort((a, b) => a.localeCompare(b, 'pl'));
    res.json(unique);
  } catch (err) {
    res.status(500).json({ error: 'Nie udało się pobrać marek' });
  }
});

// GET /api/catalog/models?make=... — distinct models for a given make
router.get('/models', async (req, res) => {
  const make = String(req.query.make || '');
  if (!make) {
    return res.status(400).json({ error: 'Parametr make jest wymagany' });
  }

  try {
    const [vehicleModels, offerModels] = await Promise.all([
      prisma.checkedVehicle.findMany({ select: { model: true }, distinct: ['model'], where: { make, model: { not: '' } } }),
      prisma.marketOffer.findMany({ select: { model: true }, distinct: ['model'], where: { make, model: { not: '' } } }),
    ]);
    const unique = [...new Set([
      ...vehicleModels.map(v => v.model),
      ...offerModels.map(o => o.model),
    ])].sort((a, b) => a.localeCompare(b, 'pl'));
    res.json(unique);
  } catch (err) {
    res.status(500).json({ error: 'Nie udało się pobrać modeli' });
  }
});

export default router;
