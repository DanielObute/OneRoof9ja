import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API, authHeaders } from '../api';

const box = (background, border) => ({
  background,
  border: `1px solid ${border}`,
  borderRadius: '10px',
  padding: '14px 18px',
  marginBottom: '24px',
  fontSize: '14px',
  lineHeight: 1.6,
});

// A short note at the top of the dashboard that says where the agent's identity check stands.
function IdentityBanner({ hidden }) {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    if (hidden) return undefined;
    let cancelled = false;
    fetch(`${API}/dashboard/identity/`, { headers: authHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setInfo(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [hidden]);

  if (hidden || !info || info.status === 'approved') return null;

  if (info.status === 'submitted') {
    return (
      <div style={box('#fbf1dc', '#e0a845')}>
        <strong>Identity submitted.</strong> Our team is checking your documents. You'll be verified
        once they approve it.
      </div>
    );
  }

  if (info.status === 'rejected') {
    return (
      <div style={box('#fbeee9', '#b85c3e')}>
        <strong>Your identity check was not approved.</strong> {info.rejection_reason}{' '}
        {info.can_submit && (
          <Link to="/agent/verify" style={{ fontWeight: 700, color: '#b85c3e' }}>
            Try again →
          </Link>
        )}
      </div>
    );
  }

  return (
    <div style={box('#fbf1dc', '#e0a845')}>
      <strong>Next step: verify your identity.</strong> Add your NIN, a government ID and a selfie so
      we can verify you.{' '}
      <Link to="/agent/verify" style={{ fontWeight: 700, color: '#4f5c3f' }}>
        Start verification →
      </Link>
    </div>
  );
}

export default IdentityBanner;