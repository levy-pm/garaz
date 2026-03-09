import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Start' },
  { to: '/vehicles', label: 'Sprawdzane pojazdy' },
  { to: '/offers', label: 'Oferty rynkowe' },
  { to: '/market', label: 'Sprawdź rynek' },
  { to: '/settings', label: 'Ustawienia' },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <>
      <div className="mobile-header">
        <div className="mobile-header-brand">
          <img className="mobile-header-logo" src="/favicon.svg" alt="Motometr" />
          <span className="mobile-header-title">Motometr</span>
        </div>
        <button
          className="hamburger-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label={sidebarOpen ? 'Zamknij menu' : 'Otwórz menu'}
        >
          {sidebarOpen ? 'X' : '☰'}
        </button>
      </div>

      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={closeSidebar}
      />

      <div className="app-layout">
        <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-logo">
            <img src="/motometr_logo.svg" alt="Motometr" className="sidebar-logo-image" />
          </div>
          <div className="sidebar-nav">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeSidebar}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </>
  );
}
