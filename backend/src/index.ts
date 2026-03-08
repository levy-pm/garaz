import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import targetCarRoutes from './routes/targetCar';
import comparisonOfferRoutes from './routes/comparisonOffer';
import engineNoteRoutes from './routes/engineNote';
import valuationCalcRoutes from './routes/valuationCalc';
import auctionCalcRoutes from './routes/auctionCalc';
import costProfileRoutes from './routes/costProfile';

const envPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');

  for (const rawLine of envContent.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

export const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/target-cars', targetCarRoutes);
app.use('/api/comparison-offers', comparisonOfferRoutes);
app.use('/api/engine-notes', engineNoteRoutes);
app.use('/api/valuation-calcs', valuationCalcRoutes);
app.use('/api/auction-calcs', auctionCalcRoutes);
app.use('/api/cost-profiles', costProfileRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
const frontendIndexPath = path.join(frontendDistPath, 'index.html');

if (fs.existsSync(frontendIndexPath)) {
  app.use(express.static(frontendDistPath));

  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(frontendIndexPath);
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
