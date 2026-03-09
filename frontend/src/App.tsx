import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import LoginScreen from './components/LoginScreen';
import StartPage from './pages/Start';
import CheckedVehiclesPage from './pages/CheckedVehicles';
import MarketOffersPage from './pages/MarketOffers';
import MarketCheckPage from './pages/MarketCheck';
import SettingsPage from './pages/Settings';
import { authApi } from './api';

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    authApi.session()
      .then(res => setAuthenticated(res.authenticated))
      .catch(() => setAuthenticated(false))
      .finally(() => setChecking(false));
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
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
