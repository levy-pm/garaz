import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import TargetCarsPage from './pages/TargetCars';
import ComparisonOffersPage from './pages/ComparisonOffers';
import EngineNotesPage from './pages/EngineNotes';
import ValuationCalcsPage from './pages/ValuationCalcs';
import AuctionCalcsPage from './pages/AuctionCalcs';
import CostProfilesPage from './pages/CostProfiles';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<TargetCarsPage />} />
          <Route path="/offers" element={<ComparisonOffersPage />} />
          <Route path="/engines" element={<EngineNotesPage />} />
          <Route path="/valuations" element={<ValuationCalcsPage />} />
          <Route path="/auctions" element={<AuctionCalcsPage />} />
          <Route path="/profiles" element={<CostProfilesPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
