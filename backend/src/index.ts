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
