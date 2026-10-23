import { Link } from 'react-router-dom';
import { formatPrice } from '../api';

function HouseCard({ house }) {
  const isRent = house.listing_type === 'rent';

  return (
    <Link to={`/houses/${house.id}`} style={{ color: 'inherit' }}>
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 6px 18px rgba(0, 0, 0, 0.15)',
        }}
      >
        <div style={{ position: 'relative' }}>
          <img
            src={house.coverImage}
            alt={house.title}
            style={{ width: '100%', height: '180px', objectFit: 'cover', display: 'block' }}
          />
          <span
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              background: isRent ? '#b85c3e' : '#c9a24a',
              color: isRent ? 'white' : '#2f2f26',
              padding: '4px 10px',
              borderRadius: '999px',
            }}
          >
            {isRent ? 'For rent' : 'For sale'}
          </span>
        </div>

        <div style={{ padding: '14px' }}>
          <h3 style={{ margin: '0 0 6px' }}>{house.title}</h3>
          <p style={{ margin: '2px 0', color: '#666' }}>{house.area}, {house.state}</p>
          <p style={{ margin: '2px 0', color: '#666' }}>{house.bedrooms} bed · {house.bathrooms} bath</p>
          <p style={{ margin: '8px 0 0', fontWeight: 'bold' }}>{formatPrice(house)}</p>
          {house.verified && (
            <span
              style={{
                display: 'inline-block',
                marginTop: '8px',
                fontSize: '12px',
                background: '#4F5C3F',
                color: 'white',
                padding: '3px 8px',
                borderRadius: '12px',
              }}
            >
              Verified
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default HouseCard;