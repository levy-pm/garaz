import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Auta docelowe' },
  { to: '/offers', label: 'Oferty' },
  { to: '/engines', label: 'Silniki' },
  { to: '/valuations', label: 'Wyceny' },
  { to: '/auctions', label: 'Licytacje' },
  { to: '/profiles', label: 'Profile kosztowe' },
];

export default function Layout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <nav style={{
        width: 220,
        background: '#1a1a2e',
        color: '#fff',
        padding: '20px 0',
        flexShrink: 0,
      }}>
        <h2 style={{ textAlign: 'center', margin: '0 0 24px', fontSize: 20 }}>Garaz</h2>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              display: 'block',
              padding: '10px 20px',
              color: isActive ? '#e94560' : '#ccc',
              textDecoration: 'none',
              fontWeight: isActive ? 700 : 400,
              borderLeft: isActive ? '3px solid #e94560' : '3px solid transparent',
            })}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <main style={{ flex: 1, padding: 24, background: '#f5f5f5' }}>
        <Outlet />
      </main>
    </div>
  );
}
