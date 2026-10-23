import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import PageWrapper from '../components/PageWrapper';
import CheckoutModal from '../components/CheckoutModal';
import { API, authHeaders, clearToken, isLoggedIn, formatPrice } from '../api';

function HouseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [house, setHouse] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ok | notfound | error
  const [showCheckout, setShowCheckout] = useState(false);
  const [receipt, setReceipt] = useState(null); // { reference, amount }, only right after paying

  const loadHouse = useCallback(
    async (isCancelled = () => false) => {
      setStatus('loading');
      try {
        let res = await fetch(`${API}/houses/${id}/`, { headers: authHeaders() });
        if (res.status === 401) {
          // the saved login is no longer valid, so forget it and load as a visitor
          clearToken();
          res = await fetch(`${API}/houses/${id}/`);
        }
        if (isCancelled()) return;
        if (res.status === 404) {
          setStatus('notfound');
          return;
        }
        if (!res.ok) throw new Error('Server error');
        setHouse(await res.json());
        setStatus('ok');
      } catch (err) {
        if (!isCancelled()) setStatus('error');
      }
    },
    [id]
  );

  useEffect(() => {
    let cancelled = false;
    setReceipt(null);
    setShowCheckout(false);
    loadHouse(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [loadHouse]);

  const goToLogin = () => navigate('/login', { state: { from: `/houses/${id}` } });

  const handleUnlock = () => {
    if (!isLoggedIn()) {
      goToLogin();
      return;
    }
    setShowCheckout(true);
  };

  // the pop-up calls this once the server has confirmed the payment
  const handlePaid = (data) => {
    setHouse(data.house);
    setReceipt({ reference: data.reference, amount: data.amount });
    setShowCheckout(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (status === 'loading') {
    return (
      <PageWrapper>
        <p>Loading…</p>
      </PageWrapper>
    );
  }

  if (status === 'notfound') {
    return (
      <PageWrapper>
        <p>House not found.</p>
        <Link to="/">Back to homes</Link>
      </PageWrapper>
    );
  }

  if (status === 'error') {
    return (
      <PageWrapper>
        <p style={{ color: '#b85c3e' }}>
          We couldn't load this house. Make sure the backend is running.
        </p>
        <Link to="/">Back to homes</Link>
      </PageWrapper>
    );
  }

  const units = house.units_available;
  const locked = house.is_locked;
  const isRent = house.listing_type === 'rent';
  const fee = house.unlock_fee ? `₦${Number(house.unlock_fee).toLocaleString()}` : '';
  const agentLink = (
    <Link to={`/agents/${house.agent_id}`} style={{ fontWeight: 700, color: '#4f5c3f' }}>
      {house.agent_name}
    </Link>
  );

  // The "Property details" box. Rows with no value are left out.
  const sqm = (n) => (n ? `${Number(n).toLocaleString()} sqm` : '');
  const detailItems = locked
    ? []
    : [
        ['Property type', house.property_type_label],
        ['Bedrooms', house.bedrooms],
        ['Bathrooms', house.bathrooms],
        ['Living rooms', house.living_rooms],
        ['Kitchens', house.kitchens],
        ['Guest toilets', house.guest_toilets],
        ['Parking spaces', house.parking_spaces],
        ["Boys' quarters", house.has_boys_quarters ? 'Yes' : 'No'],
        ['Plot size', sqm(house.plot_size_sqm)],
        ['Floor area', sqm(house.floor_area_sqm)],
        ['Year built', house.year_built || ''],
        ['Furnishing', house.furnishing_label],
        ['Title document', house.title_document_label],
        ['Agency fee', house.agency_fee ? `₦${Number(house.agency_fee).toLocaleString()}` : ''],
        [
          'Service charge',
          house.service_charge ? `₦${Number(house.service_charge).toLocaleString()} per year` : '',
        ],
      ].filter(([, value]) => value !== '' && value !== null && value !== undefined);

  return (
    <PageWrapper>
      <Link to="/">← Back to homes</Link>

      <div>
        <span
          style={{
            display: 'inline-block',
            marginTop: '16px',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            background: isRent ? '#b85c3e' : '#c9a24a',
            color: isRent ? 'white' : '#2f2f26',
            padding: '4px 12px',
            borderRadius: '999px',
          }}
        >
          {isRent ? 'For rent' : 'For sale'}
        </span>
      </div>

      <h1 style={{ color: '#4f5c3f', margin: '8px 0 6px' }}>{house.title}</h1>
      <p style={{ color: '#726f60', margin: '0 0 6px' }}>
        {house.area}, {house.state}
      </p>
      <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px' }}>
        {formatPrice(house)}
      </p>
      <p style={{ margin: '0 0 8px' }}>
        {house.bedrooms} bedrooms · {house.bathrooms} bathrooms · {units} unit{units === 1 ? '' : 's'} available
      </p>
      <p style={{ margin: '0 0 20px' }}>
        Listed by {agentLink}
        <span
          style={{
            marginLeft: '8px',
            fontSize: '12px',
            fontWeight: 700,
            background: '#4f5c3f',
            color: 'white',
            padding: '3px 8px',
            borderRadius: '12px',
          }}
        >
          Verified
        </span>
      </p>

      {locked ? (
        <>
          <img
            src={house.cover_image || 'https://placehold.co/900x500?text=No+photo'}
            alt={house.title}
            style={{ width: '100%', borderRadius: '12px' }}
          />

          <div
            style={{
              marginTop: '24px',
              padding: '28px',
              textAlign: 'center',
              background: 'white',
              border: '1.5px dashed #b85c3e',
              borderRadius: '12px',
            }}
          >
            <p style={{ fontWeight: 700, margin: '0 0 6px' }}>
              The full gallery, property details, exact street, description and agent contact are locked.
            </p>
            <p style={{ color: '#726f60', margin: '0 0 16px' }}>
              Pay a one-time fee to unlock this listing.
            </p>
            <button
              onClick={handleUnlock}
              style={{
                background: '#b85c3e',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '15px',
                cursor: 'pointer',
              }}
            >
              Unlock this house{fee ? ` — ${fee}` : ''}
            </button>
            {!isLoggedIn() && (
              <p style={{ margin: '14px 0 0', color: '#726f60', fontSize: '14px' }}>
                You'll be asked to log in or create a free account first.
              </p>
            )}
            <p style={{ margin: '14px 0 0', color: '#726f60', fontSize: '13px' }}>
              Test mode: no real money is charged.
            </p>
          </div>
        </>
      ) : (
        <>
          {receipt ? (
            <div
              style={{
                background: '#eef3e6',
                border: '1px solid #8a9a76',
                borderRadius: '10px',
                padding: '12px 16px',
                margin: '0 0 16px',
                fontSize: '14px',
                lineHeight: 1.6,
              }}
            >
              <strong>✓ Payment received.</strong> You've unlocked this house. Receipt{' '}
              <strong>{receipt.reference}</strong> · ₦{Number(receipt.amount).toLocaleString()} · test
              mode, no real money was charged.
            </div>
          ) : (
            <p style={{ margin: '0 0 16px', color: '#4f5c3f', fontWeight: 700 }}>
              ✓ You've unlocked this house
            </p>
          )}

          {house.images && house.images.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '14px',
              }}
            >
              {house.images.map((img) => (
                <img
                  key={img.id}
                  src={img.image}
                  alt={img.caption || house.title}
                  style={{ width: '100%', borderRadius: '12px' }}
                />
              ))}
            </div>
          ) : (
            <p style={{ color: '#726f60' }}>The agent hasn't added photos yet.</p>
          )}

          <h3 style={{ margin: '32px 0 14px', color: '#4f5c3f' }}>Property details</h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
              gap: '12px',
            }}
          >
            {detailItems.map(([label, value]) => (
              <div
                key={label}
                style={{
                  background: 'white',
                  border: '1px solid #e8dfc9',
                  borderRadius: '10px',
                  padding: '12px 14px',
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    color: '#726f60',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    marginBottom: '4px',
                  }}
                >
                  {label}
                </div>
                <div style={{ fontWeight: 700, fontSize: '16px' }}>{value}</div>
              </div>
            ))}
          </div>

          {house.title_document_label && (
            <p style={{ margin: '14px 0 0', fontSize: '13px', color: '#726f60', maxWidth: '640px' }}>
              The title document is as stated by the agent. Always have your lawyer check the
              original documents before you pay for any property.
            </p>
          )}

          {house.amenities && house.amenities.length > 0 && (
            <>
              <h3 style={{ margin: '28px 0 12px', color: '#4f5c3f' }}>Features and amenities</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {house.amenities.map((item, i) => (
                  <span
                    key={`${item}-${i}`}
                    style={{
                      background: '#4f5c3f',
                      color: '#f7f3e9',
                      fontSize: '13px',
                      fontWeight: 600,
                      padding: '6px 14px',
                      borderRadius: '999px',
                    }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </>
          )}

          <h3 style={{ margin: '28px 0 8px', color: '#4f5c3f' }}>Description</h3>
          <p style={{ margin: 0, lineHeight: 1.7 }}>{house.description}</p>

          <h3 style={{ margin: '28px 0 8px', color: '#4f5c3f' }}>Exact location</h3>
          <p style={{ margin: 0 }}>
            {house.street}, {house.area}, {house.state}
          </p>

          <h3 style={{ margin: '28px 0 8px', color: '#4f5c3f' }}>Agent contact</h3>
          <p style={{ margin: 0 }}>
            {agentLink} — {house.agent_phone}
          </p>
        </>
      )}

      {showCheckout && (
        <CheckoutModal
          houseId={house.id}
          houseTitle={house.title}
          fee={house.unlock_fee}
          onPaid={handlePaid}
          onClose={() => setShowCheckout(false)}
          onAlreadyUnlocked={() => {
            setShowCheckout(false);
            loadHouse();
          }}
          onAuthLost={() => {
            clearToken();
            setShowCheckout(false);
            goToLogin();
          }}
        />
      )}
    </PageWrapper>
  );
}

export default HouseDetail;