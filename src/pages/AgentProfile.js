import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageWrapper from '../components/PageWrapper';
import HouseCard from '../components/HouseCard';
import { API, toCardHouse } from '../api';

function initialsOf(name) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

function AgentProfile() {
  const { id } = useParams();
  const [agent, setAgent] = useState(null);
  const [houses, setHouses] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ok | notfound | error

  useEffect(() => {
    setStatus('loading');

    Promise.all([
      fetch(`${API}/agents/${id}/`),
      fetch(`${API}/agents/${id}/houses/`),
    ])
      .then(([agentRes, housesRes]) => {
        if (agentRes.status === 404) {
          setStatus('notfound');
          return null;
        }
        if (!agentRes.ok || !housesRes.ok) throw new Error('Server error');
        return Promise.all([agentRes.json(), housesRes.json()]);
      })
      .then((result) => {
        if (result) {
          setAgent(result[0]);
          setHouses(result[1].map(toCardHouse));
          setStatus('ok');
        }
      })
      .catch(() => setStatus('error'));
  }, [id]);

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
        <p>Agent not found.</p>
        <Link to="/">Back to homes</Link>
      </PageWrapper>
    );
  }

  if (status === 'error') {
    return (
      <PageWrapper>
        <p style={{ color: '#b85c3e' }}>
          We couldn't load this agent. Make sure the backend is running.
        </p>
        <Link to="/">Back to homes</Link>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <Link to="/">← Back to homes</Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', margin: '24px 0 20px', flexWrap: 'wrap' }}>
        <div
          style={{
            width: '96px',
            height: '96px',
            borderRadius: '50%',
            background: '#4f5c3f',
            color: '#f7f3e9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            fontWeight: 700,
            border: '3px solid #c9a24a',
            flexShrink: 0,
          }}
        >
          {initialsOf(agent.business_name)}
        </div>

        <div>
          <h1 style={{ color: '#4f5c3f', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {agent.business_name}
            {agent.is_verified && (
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  background: '#4f5c3f',
                  color: 'white',
                  padding: '4px 10px',
                  borderRadius: '12px',
                }}
              >
                Verified
              </span>
            )}
          </h1>
          <p style={{ margin: 0, color: '#726f60' }}>
            {agent.state} · {agent.areas}
          </p>
        </div>
      </div>

      {agent.bio && (
        <p style={{ maxWidth: '680px', lineHeight: 1.7, margin: '0 0 20px' }}>{agent.bio}</p>
      )}

      <div
        style={{
          background: 'white',
          border: '1.5px dashed #b85c3e',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '36px',
          fontSize: '14px',
        }}
      >
        <strong>Contact details are private.</strong> You'll see this agent's phone number after you
        unlock one of their houses.
      </div>

      <h2 style={{ color: '#4f5c3f', margin: '0 0 20px' }}>
        Available houses ({houses.length})
      </h2>

      {houses.length === 0 ? (
        <p style={{ color: '#726f60' }}>This agent has no houses listed right now.</p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '20px',
          }}
        >
          {houses.map((house) => (
            <HouseCard key={house.id} house={house} />
          ))}
        </div>
      )}
    </PageWrapper>
  );
}

export default AgentProfile;