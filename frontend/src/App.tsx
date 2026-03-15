import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import LoginScreen from './components/LoginScreen';
import StartPage from './pages/Start';
import CheckedVehiclesPage from './pages/CheckedVehicles';
import MarketOffersPage from './pages/MarketOffers';
import MarketCheckPage from './pages/MarketCheck';
import SettingsPage from './pages/Settings';
import ProfitabilityPage from './pages/Profitability';
import ComparisonPage from './pages/Comparison';
import { authApi } from './api';
import { API_UNAUTHORIZED_EVENT } from './api/client';

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    authApi.session()
      .then(res => setAuthenticated(res.authenticated))
      .catch(() => setAuthenticated(false))
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    const onUnauthorized = () => setAuthenticated(false);
    window.addEventListener(API_UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(API_UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const onPointerDown = (event: PointerEvent) => {
      if (!coarsePointer) return;

      const target = event.target as HTMLElement | null;
      if (!target) return;

      const actionable = target.closest('button, .btn, .btn-icon, .nav-link, .pagination-btn, .hamburger-btn') as HTMLElement | null;
      if (!actionable) return;
      if ((actionable as HTMLButtonElement).disabled) return;

      if ('vibrate' in navigator) navigator.vibrate(8);
      actionable.classList.add('tap-feedback');
      window.setTimeout(() => actionable.classList.remove('tap-feedback'), 120);
    };

    document.addEventListener('pointerdown', onPointerDown, { passive: true });
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  if (checking) {
    return <div className="loading" style={{ height: '100vh' }}>Ładowanie...</div>;
  }

  return (
    <>
      {!authenticated && (
        <LoginScreen onLogin={() => setAuthenticated(true)} />
      )}
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<StartPage />} />
            <Route path="/vehicles" element={<CheckedVehiclesPage />} />
            <Route path="/offers" element={<MarketOffersPage />} />
            <Route path="/market" element={<MarketCheckPage />} />
            <Route path="/profitability" element={<ProfitabilityPage />} />
            <Route path="/comparison" element={<ComparisonPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
