import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Start', icon: '⌂' },
  { to: '/vehicles', label: 'Sprawdzane pojazdy', icon: '◉' },
  { to: '/offers', label: 'Oferty rynkowe', icon: '≡' },
  { to: '/market', label: 'Sprawdź rynek', icon: '◈' },
  { to: '/settings', label: 'Ustawienia', icon: '⚙' },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <>
      {/* Mobile header */}
      <div className="mobile-header">
        <span className="mobile-header-title">Garaż</span>
        <button className="hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Overlay for mobile */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={closeSidebar}
      />

      <div className="app-layout">
        <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-logo">
            Garaż <span>v2.0</span>
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
                <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', fontSize: 11, color: 'var(--text-muted)' }}>
            Narzędzie analityczne
          </div>
        </nav>
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </>
  );
}
