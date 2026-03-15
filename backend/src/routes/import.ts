import { Router, Request, Response } from 'express';
import multer from 'multer';
import { prisma } from '../index';
import {
  parseFile,
  autoMapColumns,
  normalizeAndValidateRow,
  findDuplicates,
  TARGET_FIELDS,
  type ColumnMapping,
  type ImportPreview,
  type ImportResult,
  type ExistingOfferKey,
} from '../services/import.service';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.toLowerCase().split('.').pop();
    if (ext && ['csv', 'xlsx', 'xls'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Nieobsługiwany format pliku. Dozwolone: CSV, XLSX, XLS.'));
    }
  },
});

// POST /api/import/preview — upload file, parse, auto-map, return preview
router.post('/preview', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nie przesłano pliku.' });
    }

    const checkedVehicleId = req.body.checkedVehicleId ? Number(req.body.checkedVehicleId) : null;

    const parsed = parseFile(req.file.buffer, req.file.originalname);
    const mapping = autoMapColumns(parsed.headers);

    // Validate all rows
    const normalized = parsed.rows.map((row, i) =>
      normalizeAndValidateRow(row, mapping, i + 1)
    );

    const validRows = normalized.filter(r => r.errors.length === 0);
    const invalidRows = normalized.filter(r => r.errors.length > 0);
    const allErrors = normalized.flatMap(r => r.errors);

    // Check for duplicates against existing offers
    let duplicateCount = 0;
    if (validRows.length > 0) {
      const where: any = { isArchived: false };
      if (checkedVehicleId) where.checkedVehicleId = checkedVehicleId;

      const existingOffers = await prisma.marketOffer.findMany({
        where,
        select: { offerUrl: true, make: true, model: true, year: true, pricePLN: true, mileageKm: true },
      });

      const duplicates = findDuplicates(
        validRows.map(r => r.data as ExistingOfferKey),
        existingOffers,
      );
      duplicateCount = duplicates.size;
    }

    const preview: ImportPreview = {
      headers: parsed.headers,
      mapping,
      totalRows: parsed.totalRows,
      validRows: validRows.length,
      invalidRows: invalidRows.length,
      sampleRows: parsed.rows.slice(0, 10),
      validationErrors: allErrors.slice(0, 100),
      duplicateCount,
    };

    res.json(preview);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Błąd parsowania pliku.' });
  }
});

// POST /api/import/commit — apply the import
router.post('/commit', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nie przesłano pliku.' });
    }

    const checkedVehicleId = req.body.checkedVehicleId ? Number(req.body.checkedVehicleId) : null;
    const customMapping: ColumnMapping | null = req.body.mapping
      ? JSON.parse(req.body.mapping)
      : null;
    const skipDuplicates = req.body.skipDuplicates !== 'false';

    // Validate checkedVehicleId if provided
    if (checkedVehicleId) {
      const vehicle = await prisma.checkedVehicle.findUnique({ where: { id: checkedVehicleId } });
      if (!vehicle) {
        return res.status(404).json({ error: 'Nie znaleziono pojazdu.' });
      }
    }

    const parsed = parseFile(req.file.buffer, req.file.originalname);
    const mapping = customMapping || autoMapColumns(parsed.headers);

    // Validate mapping - at least make, model, year must be mapped
    const mappedTargets = new Set(Object.values(mapping).filter(Boolean));
    for (const required of ['make', 'model', 'year'] as const) {
      if (!mappedTargets.has(required)) {
        return res.status(400).json({ error: `Kolumna "${required}" musi być zmapowana.` });
      }
    }

    // Normalize and validate
    const normalized = parsed.rows.map((row, i) =>
      normalizeAndValidateRow(row, mapping, i + 1)
    );

    const validRecords = normalized.filter(r => r.errors.length === 0);
    const invalidRecords = normalized.filter(r => r.errors.length > 0);

    // Deduplication
    let duplicateIndices = new Set<number>();
    if (skipDuplicates && validRecords.length > 0) {
      const where: any = { isArchived: false };
      if (checkedVehicleId) where.checkedVehicleId = checkedVehicleId;

      const existingOffers = await prisma.marketOffer.findMany({
        where,
        select: { offerUrl: true, make: true, model: true, year: true, pricePLN: true, mileageKm: true },
      });

      const tempDups = findDuplicates(
        validRecords.map(r => r.data as ExistingOfferKey),
        existingOffers,
      );
      duplicateIndices = tempDups;
    }

    // Insert valid, non-duplicate records
    let imported = 0;
    let duplicatesSkipped = 0;
    const rejectedReasons: { row: number; reasons: string[] }[] = [];

    for (let i = 0; i < validRecords.length; i++) {
      if (duplicateIndices.has(i)) {
        duplicatesSkipped++;
        continue;
      }

      const record = validRecords[i];
      const offerData: any = { ...record.data };

      if (checkedVehicleId) {
        offerData.checkedVehicleId = checkedVehicleId;
      }

      // Remove fields not in Prisma model
      delete offerData.engineCode;
      delete offerData.engineFamily;

      try {
        await prisma.marketOffer.create({ data: offerData });
        imported++;
      } catch (err: any) {
        rejectedReasons.push({
          row: record.rowIndex,
          reasons: [err.message || 'Błąd zapisu do bazy danych'],
        });
      }
    }

    // Collect rejected info from invalid records
    for (const inv of invalidRecords) {
      rejectedReasons.push({
        row: inv.rowIndex,
        reasons: inv.errors.map(e => `${e.field}: ${e.message}`),
      });
    }

    const result: ImportResult = {
      imported,
      skipped: duplicatesSkipped,
      rejected: invalidRecords.length + rejectedReasons.filter(r => !invalidRecords.find(ir => ir.rowIndex === r.row)).length - imported + validRecords.length - duplicatesSkipped,
      rejectedReasons: rejectedReasons.slice(0, 50),
      duplicatesSkipped,
    };

    // Simplify: count properly
    result.rejected = invalidRecords.length + (validRecords.length - duplicatesSkipped - imported);

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Błąd importu.' });
  }
});

// GET /api/import/target-fields — available target fields for mapping UI
router.get('/target-fields', (_req: Request, res: Response) => {
  res.json(TARGET_FIELDS);
});

export default router;
