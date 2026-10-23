import { useState, useEffect } from 'react';
import HouseRow from '../components/HouseRow';
import Hero from '../components/Hero';
import Scenery from '../components/Scenery';
import { API, toCardHouse } from '../api';

const comingSoonStates = ['Rivers', 'Oyo', 'Enugu', 'Kano'];

const typeOptions = [
  ['all', 'All homes'],
  ['rent', 'For rent'],
  ['sale', 'For sale'],
];

const labelStyle = {
  fontSize: '12px',
  fontWeight: 700,
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  color: '#726f60',
  margin: '0 0 8px',
};

const rowStyle = { display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' };

function Home() {
  const [locations, setLocations] = useState({}); // e.g. { Lagos: ['Ikoyi', ...], Abuja: [...] }
  const [selectedType, setSelectedType] = useState('all');
  const [selectedState, setSelectedState] = useState('All');
  const [selectedArea, setSelectedArea] = useState('');
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // The open states and their areas come from the backend, so they only live in one place.
  useEffect(() => {
    fetch(`${API}/locations/`)
      .then((res) => (res.ok ? res.json() : {}))
      .then(setLocations)
      .catch(() => setLocations({}));
  }, []);

  // Reload the houses whenever a filter changes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const params = new URLSearchParams();
    if (selectedType !== 'all') params.set('type', selectedType);
    if (selectedState !== 'All') params.set('state', selectedState);
    if (selectedArea) params.set('area', selectedArea);
    const query = params.toString();

    fetch(`${API}/houses/${query ? `?${query}` : ''}`)
      .then((res) => {
        if (!res.ok) throw new Error('Server error');
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setHouses(data.map(toCardHouse));
      })
      .catch(() => {
        if (!cancelled) setError("We couldn't load the houses. Make sure the backend is running.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedType, selectedState, selectedArea]);

  const chooseState = (state) => {
    setSelectedState(state);
    setSelectedArea(''); // an area only makes sense inside its own state
  };

  const clearFilters = () => {
    setSelectedType('all');
    setSelectedState('All');
    setSelectedArea('');
  };

  const hasFilters = selectedType !== 'all' || selectedState !== 'All' || selectedArea !== '';
  const activeStates = Object.keys(locations);
  const areasOfState = selectedState !== 'All' ? locations[selectedState] || [] : [];

  const chipStyle = (active) => ({
    padding: '8px 18px',
    borderRadius: '999px',
    border: '1.5px solid #4f5c3f',
    background: active ? '#4f5c3f' : 'transparent',
    color: active ? '#f7f3e9' : '#4f5c3f',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  });

  const comingSoonStyle = {
    padding: '8px 18px',
    borderRadius: '999px',
    border: '1.5px dashed rgba(79, 92, 63, 0.45)',
    color: 'rgba(79, 92, 63, 0.65)',
    fontSize: '14px',
  };

  return (
    <div>
      <Hero />

      <div
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, #5d6b4c 0%, #3a4630 45%, #262f20 100%)',
          display: 'flex',
          flexDirection: 'column',
          padding: '50px 32px 0',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '1200px',
            margin: '0 auto',
            background: '#f7f3e9',
            borderRadius: '14px',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.35)',
          }}
        >
          <div style={{ height: '3px', background: '#c9a24a' }} />

          <div style={{ padding: '44px 52px' }}>
            <h2 style={{ color: '#4f5c3f', margin: '0 0 24px', fontSize: '28px' }}>
              Premium verified homes
            </h2>

            <p style={labelStyle}>Looking to</p>
            <div style={rowStyle}>
              {typeOptions.map(([value, label]) => (
                <button
                  key={value}
                  style={chipStyle(selectedType === value)}
                  onClick={() => setSelectedType(value)}
                >
                  {label}
                </button>
              ))}
            </div>

            <p style={labelStyle}>State</p>
            <div style={rowStyle}>
              <button style={chipStyle(selectedState === 'All')} onClick={() => chooseState('All')}>
                All
              </button>
              {activeStates.map((state) => (
                <button
                  key={state}
                  style={chipStyle(selectedState === state)}
                  onClick={() => chooseState(state)}
                >
                  {state}
                </button>
              ))}
              {comingSoonStates.map((state) => (
                <span key={state} style={comingSoonStyle}>
                  {state} · Coming soon
                </span>
              ))}
            </div>

            {areasOfState.length > 0 && (
              <>
                <p style={labelStyle}>Area in {selectedState}</p>
                <div style={rowStyle}>
                  <button style={chipStyle(selectedArea === '')} onClick={() => setSelectedArea('')}>
                    All areas
                  </button>
                  {areasOfState.map((area) => (
                    <button
                      key={area}
                      style={chipStyle(selectedArea === area)}
                      onClick={() => setSelectedArea(area)}
                    >
                      {area}
                    </button>
                  ))}
                </div>
              </>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                margin: '8px 0 24px',
                minHeight: '24px',
              }}
            >
              {!loading && !error && (
                <span style={{ color: '#726f60', fontSize: '14px' }}>
                  {houses.length} home{houses.length === 1 ? '' : 's'} found
                </span>
              )}
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: '#b85c3e',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>

            {loading && <p style={{ color: '#726f60' }}>Loading homes…</p>}
            {error && <p style={{ color: '#b85c3e' }}>{error}</p>}
            {!loading && !error && houses.length === 0 && (
              <p style={{ color: '#726f60' }}>No homes match these filters yet.</p>
            )}

            {houses.length > 0 && <HouseRow houses={houses} />}
          </div>
        </div>

        <Scenery />
      </div>
    </div>
  );
}

export default Home;