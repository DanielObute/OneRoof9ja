import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.svg';
import { isLoggedIn, clearToken } from '../api';

const linkStyle = {
  textTransform: 'uppercase',
  fontWeight: 700,
  fontSize: '14px',
  letterSpacing: '1.5px',
  color: '#4f5c3f',
  textDecoration: 'none',
};

function Navbar() {
  useLocation(); // re-checks whether someone is logged in each time the page changes
  const navigate = useNavigate();
  const [, refresh] = useState(0);

  const handleLogout = () => {
    clearToken();
    refresh((n) => n + 1);
    navigate('/');
  };

  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 48px 0 0',
        margin: '0',
        background: '#f7f3e9',
        borderBottom: '1px solid #ddd',
      }}
    >
      <img src={logo} alt="OneRoof9ja" style={{ height: '130px', display: 'block' }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', gap: '14px 28px' }}>
        <Link to="/" style={linkStyle}>Browse homes</Link>
        <Link to="/about" style={linkStyle}>About us</Link>
        <Link to="/agent/register" style={linkStyle}>Register as agent</Link>
        <Link to="/agent/dashboard" style={linkStyle}>Agent dashboard</Link>
        {isLoggedIn() ? (
          <button
            onClick={handleLogout}
            style={{
              ...linkStyle,
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Log out
          </button>
        ) : (
          <Link to="/login" style={linkStyle}>Log in</Link>
        )}
      </div>
    </nav>
  );
}

export default Navbar;