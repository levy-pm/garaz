import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import StartPage from './pages/Start';
import CheckedVehiclesPage from './pages/CheckedVehicles';
import MarketOffersPage from './pages/MarketOffers';
import MarketCheckPage from './pages/MarketCheck';
import SettingsPage from './pages/Settings';

function App() {
  return (
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
  );
}

export default App;
