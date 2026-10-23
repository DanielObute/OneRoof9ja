import { useState, useEffect } from 'react';
import { API, authHeaders, firstError } from '../api';
import { labelStyle, inputStyle, primaryBtn } from '../styles';

const DEMO_CARDS = [
  { label: 'Successful payment', number: '4242 4242 4242 4242' },
  { label: 'Card declined', number: '4000 0000 0000 0002' },
  { label: 'Insufficient funds', number: '4000 0000 0000 9995' },
];

// any expiry in the future works, so the demo cards always use "December, three years from now"
const demoExpiry = () => `12/${String((new Date().getFullYear() + 3) % 100).padStart(2, '0')}`;

// "4242424242424242" becomes "4242 4242 4242 4242"
const formatNumber = (raw) =>
  raw.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();

// "1230" becomes "12/30"
const formatExpiry = (raw) => {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

const demoChip = {
  background: 'white',
  border: '1.5px solid #ddd3bd',
  borderRadius: '10px',
  padding: '9px 12px',
  textAlign: 'left',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: '12px',
  color: '#2f2f26',
  lineHeight: 1.5,
};

function CheckoutModal({ houseId, houseTitle, fee, onPaid, onAlreadyUnlocked, onAuthLost, onClose }) {
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '' });
  const [reference, setReference] = useState(null); // the open payment, once one has been started
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const feeText = fee ? `₦${Number(fee).toLocaleString()}` : '';

  // Escape closes the pop-up (unless a payment is in progress)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const fillDemoCard = (number) => {
    setCard({ number, expiry: demoExpiry(), cvv: '123' });
    setError('');
  };

  const pay = async (e) => {
    e.preventDefault();
    setError('');

    // quick checks here, so a typo doesn't need a trip to the server
    const digits = card.number.replace(/\D/g, '');
    if (digits.length < 13) {
      setError('Enter a valid card number.');
      return;
    }
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(card.expiry)) {
      setError('Enter the expiry date as MM/YY.');
      return;
    }
    if (!/^\d{3,4}$/.test(card.cvv)) {
      setError('Enter the 3 or 4 digit security code.');
      return;
    }

    setBusy(true);
    try {
      // Step 1: open a payment (only once, unless the last one ended)
      let ref = reference;
      if (!ref) {
        const startRes = await fetch(`${API}/houses/${houseId}/pay/`, {
          method: 'POST',
          headers: authHeaders(),
        });
        const started = await startRes.json().catch(() => null);
        if (startRes.status === 401) {
          onAuthLost();
          return;
        }
        if (!startRes.ok) {
          setError(firstError(started));
          return;
        }
        if (started.already_unlocked) {
          onAlreadyUnlocked();
          return;
        }
        ref = started.reference;
        setReference(ref);
      }

      // Step 2: charge the card. Only the server decides if the payment worked.
      const res = await fetch(`${API}/payments/${ref}/charge/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ card_number: digits, expiry: card.expiry, cvv: card.cvv }),
      });
      const data = await res.json().catch(() => null);

      if (res.status === 401) {
        onAuthLost();
        return;
      }
      if (res.ok) {
        onPaid(data);
        return;
      }

      // Declined (402) or ended (409): that payment is over, so the next try opens a new one.
      // A mistyped card (400) leaves the payment open, so it is reused.
      if (res.status === 402 || res.status === 409) setReference(null);
      setError(firstError(data));
    } catch (err) {
      setError("We couldn't reach the server. Make sure the backend is running.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="presentation"
      onClick={busy ? undefined : onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        zIndex: 1000,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pay to unlock this house"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#f7f3e9',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '460px',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '26px 28px 28px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.4)',
          borderTop: '3px solid #c9a24a',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <div>
            <h2 style={{ color: '#4f5c3f', margin: '0 0 4px', fontSize: '22px' }}>Unlock this house</h2>
            <p style={{ margin: 0, color: '#726f60', fontSize: '14px' }}>{houseTitle}</p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            disabled={busy}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '26px',
              lineHeight: 1,
              color: '#726f60',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            background: '#fbf1dc',
            border: '1px solid #e0a845',
            borderRadius: '10px',
            padding: '11px 14px',
            margin: '18px 0',
            fontSize: '13px',
            lineHeight: 1.55,
          }}
        >
          <strong>TEST MODE.</strong> No real money is charged. Never type a real card number here.
          Only the demo cards at the bottom work.
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '0 0 16px',
            marginBottom: '16px',
            borderBottom: '1px solid #e4dcc9',
            fontSize: '15px',
          }}
        >
          <span>One-time unlock</span>
          <strong>{feeText}</strong>
        </div>

        <form onSubmit={pay}>
          <label style={labelStyle}>Card number</label>
          <input
            inputMode="numeric"
            autoComplete="off"
            placeholder="4242 4242 4242 4242"
            style={inputStyle}
            value={card.number}
            onChange={(e) => setCard({ ...card, number: formatNumber(e.target.value) })}
          />

          <div style={{ display: 'flex', gap: '14px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Expiry (MM/YY)</label>
              <input
                inputMode="numeric"
                autoComplete="off"
                placeholder="12/30"
                style={inputStyle}
                value={card.expiry}
                onChange={(e) => setCard({ ...card, expiry: formatExpiry(e.target.value) })}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Security code (CVV)</label>
              <input
                inputMode="numeric"
                autoComplete="off"
                placeholder="123"
                style={inputStyle}
                value={card.cvv}
                onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
              />
            </div>
          </div>

          {error && (
            <p style={{ color: '#b85c3e', margin: '0 0 14px', fontSize: '14px', lineHeight: 1.5 }}>{error}</p>
          )}

          <button type="submit" style={{ ...primaryBtn, width: '100%' }} disabled={busy}>
            {busy ? 'Processing…' : `Pay ${feeText}`}
          </button>
        </form>

        <p style={{ margin: '22px 0 8px', fontSize: '12px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#726f60' }}>
          Demo cards (click one to fill it in)
        </p>
        <div style={{ display: 'grid', gap: '8px' }}>
          {DEMO_CARDS.map((demo) => (
            <button
              type="button"
              key={demo.number}
              disabled={busy}
              onClick={() => fillDemoCard(demo.number)}
              style={demoChip}
            >
              <strong>{demo.label}</strong>
              <br />
              {demo.number}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CheckoutModal;