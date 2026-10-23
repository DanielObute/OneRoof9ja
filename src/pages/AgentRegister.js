import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageWrapper from '../components/PageWrapper';
import { API, saveToken, firstError } from '../api';
import { labelStyle, inputStyle, selectStyle, primaryBtn } from '../styles';

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

function AgentRegister() {
  const navigate = useNavigate();
  const [locations, setLocations] = useState({}); // e.g. { Lagos: ['Ikoyi', ...], Abuja: [...] }
  const [form, setForm] = useState({
    business_name: '',
    cac_number: '',
    phone: '',
    email: '',
    password: '',
    state: '',
    bio: '',
  });
  const [areas, setAreas] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [doneName, setDoneName] = useState(''); // filled in once the application is saved

  // The open states and areas come from the backend, so they only live in one place.
  useEffect(() => {
    fetch(`${API}/locations/`)
      .then((res) => (res.ok ? res.json() : {}))
      .then(setLocations)
      .catch(() => setLocations({}));
  }, []);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const chooseState = (e) => {
    setForm({ ...form, state: e.target.value });
    setAreas([]); // areas belong to one state, so start the choice again
  };

  const toggleArea = (area) =>
    setAreas(areas.includes(area) ? areas.filter((a) => a !== area) : [...areas, area]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (areas.length === 0) {
      setError('Please choose at least one area where your houses are.');
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`${API}/auth/agent-signup/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          email: form.email.trim().toLowerCase(),
          areas,
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(firstError(data));
        return;
      }

      saveToken(data.token); // the new agent is now logged in
      setDoneName(data.business_name);
      // open this same page again, so the navbar notices the new login
      navigate('/agent/register', { replace: true });
    } catch (err) {
      setError("We couldn't reach the server. Make sure the backend is running.");
    } finally {
      setBusy(false);
    }
  };

  if (doneName) {
    return (
      <PageWrapper>
        <div style={{ maxWidth: '560px' }}>
          <h1 style={{ color: '#4f5c3f', margin: '0 0 14px' }}>Application received</h1>
          <p style={{ lineHeight: 1.7, margin: '0 0 12px' }}>
            Thank you, {doneName}. Your agent account is created and you're logged in.
          </p>
          <p style={{ lineHeight: 1.7, margin: '0 0 24px', color: '#726f60' }}>
            Before any of your houses can go live, our team will contact you to verify your identity
            and your business registration. Until that's done, your listings stay private.
          </p>
          <Link to="/agent/dashboard" style={{ fontWeight: 700, color: '#4f5c3f' }}>
            Go to your dashboard →
          </Link>
        </div>
      </PageWrapper>
    );
  }

  const areasOfState = form.state ? locations[form.state] || [] : [];

  return (
    <PageWrapper>
      <h1 style={{ color: '#4f5c3f', margin: '0 0 6px' }}>Register as an agent</h1>
      <p style={{ color: '#726f60', margin: '0 0 20px' }}>
        We only list verified agents, so every application is checked by our team.
      </p>

      <div
        style={{
          maxWidth: '560px',
          background: 'white',
          border: '1.5px dashed #b85c3e',
          borderRadius: '12px',
          padding: '14px 18px',
          marginBottom: '28px',
          fontSize: '14px',
          lineHeight: 1.6,
        }}
      >
        <strong>How verification works.</strong> After you apply, our team will contact you to check
        your identity and your business registration. You can't list houses publicly until that's done.
      </div>

      <form onSubmit={handleSubmit} style={{ maxWidth: '560px' }}>
        <label style={labelStyle}>Business / agent name</label>
        <input required style={inputStyle} value={form.business_name} onChange={update('business_name')} />

        <label style={labelStyle}>CAC registration number</label>
        <input
          required
          style={inputStyle}
          value={form.cac_number}
          onChange={update('cac_number')}
          placeholder="e.g. RC 1234567"
        />

        <label style={labelStyle}>Phone</label>
        <input
          required
          type="tel"
          style={inputStyle}
          value={form.phone}
          onChange={update('phone')}
          placeholder="e.g. 0803 000 0000"
        />

        <label style={labelStyle}>Email (you'll use this to log in)</label>
        <input required type="email" style={inputStyle} value={form.email} onChange={update('email')} />

        <label style={labelStyle}>Password</label>
        <input
          required
          type="password"
          minLength={8}
          style={inputStyle}
          value={form.password}
          onChange={update('password')}
        />

        <label style={labelStyle}>State you operate in</label>
        <select required style={selectStyle} value={form.state} onChange={chooseState}>
          <option value="">Select a state</option>
          {Object.keys(locations).map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>

        {areasOfState.length > 0 && (
          <>
            <label style={labelStyle}>Areas where your houses are (choose all that apply)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '18px' }}>
              {areasOfState.map((area) => (
                <button
                  type="button"
                  key={area}
                  onClick={() => toggleArea(area)}
                  style={chipStyle(areas.includes(area))}
                >
                  {area}
                </button>
              ))}
            </div>
          </>
        )}

        <label style={labelStyle}>Short bio (optional)</label>
        <textarea rows={3} style={inputStyle} value={form.bio} onChange={update('bio')} />

        {error && <p style={{ color: '#b85c3e', marginTop: 0 }}>{error}</p>}

        <button type="submit" style={primaryBtn} disabled={busy}>
          {busy ? 'Please wait…' : 'Submit application'}
        </button>
      </form>
    </PageWrapper>
  );
}

export default AgentRegister;