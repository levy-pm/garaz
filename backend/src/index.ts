import express from 'express';
import cors from 'cors';
import session from 'express-session';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import checkedVehicleRoutes from './routes/checkedVehicle';
import marketOfferRoutes from './routes/marketOffer';
import settingsRoutes from './routes/settings';
import marketAnalysisRoutes from './routes/marketAnalysis';
import profitabilityRoutes from './routes/profitability';
import importRoutes from './routes/import';
import comparisonRoutes from './routes/comparison';
import authRoutes from './routes/auth';
import catalogRoutes from './routes/catalog';

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
const isProduction = process.env.NODE_ENV === 'production';
const sessionSecret = process.env.SESSION_SECRET || 'motometr-dev-session-secret';

if (!process.env.SESSION_SECRET) {
  console.warn('[auth] SESSION_SECRET not set, using development fallback secret.');
}

// Trust proxy (needed behind reverse proxy for secure cookies)
app.set('trust proxy', 1);

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

// Session middleware (in-memory, resets on server restart)
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24h
  },
}));

// Auth routes (public)
app.use('/api/auth', authRoutes);

// Health check (public)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Catalog routes (public — needed on login page if needed, but fine to guard too)
app.use('/api/catalog', catalogRoutes);

// Auth guard for all other /api routes
app.use('/api', (req, res, next) => {
  if (req.session.authenticated) {
    return next();
  }
  res.status(401).json({ error: 'Nie zalogowano' });
});

// Protected routes
app.use('/api/checked-vehicles', checkedVehicleRoutes);
app.use('/api/market-offers', marketOfferRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/market-analysis', marketAnalysisRoutes);
app.use('/api/profitability', profitabilityRoutes);
app.use('/api/import', importRoutes);
app.use('/api/comparison', comparisonRoutes);

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
