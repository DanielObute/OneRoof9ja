import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import PageWrapper from '../components/PageWrapper';
import ListingCard from '../components/ListingCard';
import IdentityBanner from '../components/IdentityBanner';
import { API, authHeaders, clearToken, firstError, isLoggedIn } from '../api';
import { labelStyle, inputStyle, selectStyle, primaryBtn, outlineBtn } from '../styles';

const MIN_PHOTOS = 4;
const MAX_PHOTOS = 20;
const MAX_PHOTO_MB = 10;

const AMENITY_SUGGESTIONS = [
  'Swimming pool',
  'Gym',
  'CCTV',
  '24-hour security',
  'Generator',
  'Inverter / solar',
  'Borehole',
  'Landscaped garden',
  'Elevator',
  'Smart home',
  'Fitted kitchen',
  'Air conditioning',
];

const FIELD_LABELS = {
  title: 'Title',
  listing_type: 'Rent or sale',
  rent_period: 'Rent period',
  state: 'State',
  area: 'Area',
  price: 'Price',
  bedrooms: 'Bedrooms',
  bathrooms: 'Bathrooms',
  units_available: 'Units available',
  street: 'Street address',
  description: 'Description',
  property_type: 'Property type',
  living_rooms: 'Living rooms',
  kitchens: 'Kitchens',
  guest_toilets: 'Guest toilets',
  parking_spaces: 'Parking spaces',
  plot_size_sqm: 'Plot size',
  floor_area_sqm: 'Floor area',
  year_built: 'Year built',
  furnishing: 'Furnishing',
  amenities: 'Amenities',
  title_document: 'Title document',
  service_charge: 'Service charge',
  agency_fee: 'Agency fee',
};

// Turns Django's error reply into one readable line, with the field name in front.
function describe(data) {
  if (!data || typeof data !== 'object') return firstError(data);
  const [key, value] = Object.entries(data)[0] || [];
  const text = Array.isArray(value) ? value[0] : value;
  if (typeof text !== 'string') return firstError(data);
  const label = FIELD_LABELS[key];
  return label ? `${label}: ${text}` : text;
}

// An empty box means "not given", which the backend wants as null, not as "".
const orNull = (value) => (value === '' || value === null ? null : Number(value));

const emptyForm = (state) => ({
  title: '',
  listing_type: 'rent',
  rent_period: 'year',
  state: state || '',
  area: '',
  price: '',
  bedrooms: 1,
  bathrooms: 1,
  units_available: 1,
  street: '',
  description: '',
  property_type: '',
  living_rooms: 1,
  kitchens: 1,
  guest_toilets: 0,
  parking_spaces: 0,
  has_boys_quarters: false,
  plot_size_sqm: '',
  floor_area_sqm: '',
  year_built: '',
  furnishing: 'unfurnished',
  title_document: '',
  service_charge: '',
  agency_fee: '',
});

// Turns a house from the backend into the shape the form uses.
// The backend sends empty optional numbers as null, and the form wants an empty box.
const toForm = (d) => ({
  title: d.title,
  listing_type: d.listing_type,
  rent_period: d.rent_period || 'year',
  state: d.state,
  area: d.area,
  price: String(Number(d.price)),
  bedrooms: d.bedrooms,
  bathrooms: d.bathrooms,
  units_available: d.units_available,
  street: d.street,
  description: d.description,
  property_type: d.property_type || '',
  living_rooms: d.living_rooms,
  kitchens: d.kitchens,
  guest_toilets: d.guest_toilets,
  parking_spaces: d.parking_spaces,
  has_boys_quarters: d.has_boys_quarters,
  plot_size_sqm: d.plot_size_sqm === null ? '' : d.plot_size_sqm,
  floor_area_sqm: d.floor_area_sqm === null ? '' : d.floor_area_sqm,
  year_built: d.year_built === null ? '' : d.year_built,
  furnishing: d.furnishing,
  title_document: d.title_document || '',
  service_charge: d.service_charge === null ? '' : String(Number(d.service_charge)),
  agency_fee: d.agency_fee === null ? '' : String(Number(d.agency_fee)),
});

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

const sectionTitle = { color: '#4f5c3f', margin: '34px 0 6px', fontSize: '18px' };
const hintStyle = { margin: '0 0 16px', fontSize: '13px', color: '#726f60' };
const grid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
  gap: '0 16px',
};

function AgentDashboard() {
  const [phase, setPhase] = useState('loading'); // loading | login | notagent | error | ready
  const [agent, setAgent] = useState(null);
  const [houses, setHouses] = useState([]);
  const [locations, setLocations] = useState({});
  const [options, setOptions] = useState({ property_types: [], furnishing: [], title_documents: [] });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm(''));
  const [amenities, setAmenities] = useState([]);
  const [otherAmenities, setOtherAmenities] = useState('');
  const [photos, setPhotos] = useState([]); // each one is { file, url }
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null); // { kind: 'good' | 'warn', text }
  const [editingId, setEditingId] = useState(null); // the house being edited, or null when adding
  const formRef = useRef(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      setPhase('login');
      return undefined;
    }

    let cancelled = false;

    async function load() {
      try {
        const meRes = await fetch(`${API}/dashboard/me/`, { headers: authHeaders() });
        if (cancelled) return;
        if (meRes.status === 401) {
          clearToken(); // the saved login is no longer valid
          setPhase('login');
          return;
        }
        if (meRes.status === 403) {
          setPhase('notagent');
          return;
        }
        if (!meRes.ok) throw new Error('Server error');

        const [housesRes, locRes, optRes] = await Promise.all([
          fetch(`${API}/dashboard/houses/`, { headers: authHeaders() }),
          fetch(`${API}/locations/`),
          fetch(`${API}/options/`),
        ]);
        if (!housesRes.ok || !locRes.ok || !optRes.ok) throw new Error('Server error');

        const me = await meRes.json();
        const mine = await housesRes.json();
        const locs = await locRes.json();
        const opts = await optRes.json();
        if (cancelled) return;

        setAgent(me);
        setHouses(mine);
        setLocations(locs);
        setOptions(opts);
        setForm(emptyForm(me.state));
        setPhase('ready');
      } catch (err) {
        if (!cancelled) setPhase('error');
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Reloads the agent's numbers and listings after something changes.
  const refresh = async () => {
    try {
      const [meRes, housesRes] = await Promise.all([
        fetch(`${API}/dashboard/me/`, { headers: authHeaders() }),
        fetch(`${API}/dashboard/houses/`, { headers: authHeaders() }),
      ]);
      if (meRes.ok) setAgent(await meRes.json());
      if (housesRes.ok) setHouses(await housesRes.json());
    } catch (err) {
      // the old numbers stay on screen
    }
  };

  const handleCardChange = (updated) => {
    setHouses(houses.map((h) => (h.id === updated.id ? updated : h)));
  };

  const handleCardDeleted = (id) => {
    setHouses(houses.filter((h) => h.id !== id));
    refresh();
  };

  // Empties the form and closes it (used after saving, and by the Cancel button).
  const closeForm = () => {
    photos.forEach((p) => URL.revokeObjectURL(p.url));
    setPhotos([]);
    setAmenities([]);
    setOtherAmenities('');
    setForm(emptyForm(agent.state));
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  // Opens the form filled in with a house's saved details.
  const startEdit = async (house) => {
    setNotice(null);
    try {
      const res = await fetch(`${API}/dashboard/houses/${house.id}/`, { headers: authHeaders() });
      const data = await res.json().catch(() => null);

      if (res.status === 401) {
        clearToken();
        setPhase('login');
        return;
      }
      if (!res.ok) {
        setNotice({ kind: 'warn', text: describe(data) });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      photos.forEach((p) => URL.revokeObjectURL(p.url));
      setPhotos([]);

      // the saved amenities are one line of text, so split them back into buttons and extras
      const saved = data.amenities.split(',').map((s) => s.trim()).filter(Boolean);
      setAmenities(saved.filter((item) => AMENITY_SUGGESTIONS.includes(item)));
      setOtherAmenities(saved.filter((item) => !AMENITY_SUGGESTIONS.includes(item)).join(', '));

      setForm(toForm(data));
      setError('');
      setEditingId(house.id);
      setShowForm(true);

      // give the form a moment to appear, then scroll down to it
      setTimeout(() => {
        if (formRef.current) formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    } catch (err) {
      setNotice({ kind: 'warn', text: "We couldn't open this listing. Make sure the backend is running." });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const chooseState = (e) => setForm({ ...form, state: e.target.value, area: '' });

  const toggleAmenity = (name) =>
    setAmenities(amenities.includes(name) ? amenities.filter((a) => a !== name) : [...amenities, name]);

  const addPhotos = (e) => {
    const chosen = Array.from(e.target.files);
    e.target.value = '';
    setError('');

    const added = [];
    for (const file of chosen) {
      if (!file.type.startsWith('image/')) {
        setError(`${file.name} isn't a picture.`);
        continue;
      }
      if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
        setError(`${file.name} is bigger than ${MAX_PHOTO_MB} MB.`);
        continue;
      }
      added.push({ file, url: URL.createObjectURL(file) });
    }

    if (photos.length + added.length > MAX_PHOTOS) {
      added.forEach((p) => URL.revokeObjectURL(p.url));
      setError(`You can add up to ${MAX_PHOTOS} photos.`);
      return;
    }
    setPhotos([...photos, ...added]);
  };

  const removePhoto = (index) => {
    URL.revokeObjectURL(photos[index].url);
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const editing = editingId !== null;

    if (!form.area) {
      setError('Please choose the area.');
      return;
    }
    // photos are only asked for when adding. An existing house keeps the ones it has.
    if (!editing && photos.length < MIN_PHOTOS) {
      setError(
        `Please add at least ${MIN_PHOTOS} photos: the outside, the living room, a bedroom and a bathroom.`
      );
      return;
    }

    setBusy(true);
    try {
      const extra = otherAmenities.split(',').map((s) => s.trim()).filter(Boolean);
      const allAmenities = [...new Set([...amenities, ...extra])].join(', ');

      const payload = {
        ...form,
        plot_size_sqm: orNull(form.plot_size_sqm),
        floor_area_sqm: orNull(form.floor_area_sqm),
        year_built: orNull(form.year_built),
        service_charge: orNull(form.service_charge),
        agency_fee: form.listing_type === 'rent' ? orNull(form.agency_fee) : null,
        amenities: allAmenities,
      };

      const res = await fetch(
        editing ? `${API}/dashboard/houses/${editingId}/` : `${API}/dashboard/houses/`,
        {
          method: editing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json().catch(() => null);

      if (res.status === 401) {
        clearToken();
        setPhase('login');
        return;
      }
      if (!res.ok) {
        setError(describe(data));
        return;
      }

      if (editing) {
        closeForm();
        await refresh();
        setNotice({
          kind: 'good',
          text: 'Your changes were saved and the listing was sent for review. It will appear on the site once our team approves it.',
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // The house is saved. Now send its photos.
      const body = new FormData();
      photos.forEach((p) => body.append('images', p.file));
      const upRes = await fetch(`${API}/dashboard/houses/${data.id}/images/`, {
        method: 'POST',
        headers: authHeaders(),
        body,
      });
      const upData = await upRes.json().catch(() => null);

      closeForm();
      await refresh();

      if (upRes.ok) {
        setNotice({
          kind: 'good',
          text: 'Your listing was saved and sent for review. It will appear on the site once our team approves it.',
        });
      } else {
        setNotice({
          kind: 'warn',
          text: `Your house was saved, but its photos didn't upload: ${firstError(
            upData
          )} Add them from the listing below.`,
        });
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError("We couldn't reach the server. Make sure the backend is running.");
    } finally {
      setBusy(false);
    }
  };

  if (phase === 'loading') {
    return (
      <PageWrapper>
        <p>Loading your dashboard…</p>
      </PageWrapper>
    );
  }

  if (phase === 'login') {
    return (
      <PageWrapper>
        <h1 style={{ color: '#4f5c3f', margin: '0 0 10px' }}>Agent dashboard</h1>
        <p style={{ margin: '0 0 20px', color: '#726f60' }}>
          Log in with your agent account to add and manage your houses.
        </p>
        <Link
          to="/login"
          state={{ from: '/agent/dashboard' }}
          style={{ fontWeight: 700, color: '#4f5c3f' }}
        >
          Log in →
        </Link>
        <p style={{ margin: '24px 0 0', fontSize: '14px' }}>
          Not an agent yet?{' '}
          <Link to="/agent/register" style={{ fontWeight: 700, color: '#b85c3e' }}>
            Register as an agent
          </Link>
        </p>
      </PageWrapper>
    );
  }

  if (phase === 'notagent') {
    return (
      <PageWrapper>
        <h1 style={{ color: '#4f5c3f', margin: '0 0 10px' }}>Agent dashboard</h1>
        <p style={{ margin: '0 0 12px', maxWidth: '560px', lineHeight: 1.7 }}>
          You're logged in, but this isn't an agent account. It's a house-hunter account.
        </p>
        <p style={{ margin: '0 0 20px', maxWidth: '560px', lineHeight: 1.7, color: '#726f60' }}>
          To list houses, register as an agent using a different email address, then log in with that one.
        </p>
        <Link to="/agent/register" style={{ fontWeight: 700, color: '#4f5c3f' }}>
          Register as an agent →
        </Link>
      </PageWrapper>
    );
  }

  if (phase === 'error') {
    return (
      <PageWrapper>
        <p style={{ color: '#b85c3e' }}>
          We couldn't load your dashboard. Make sure the backend is running, then refresh the page.
        </p>
      </PageWrapper>
    );
  }

  const areasOfState = form.state ? locations[form.state] || [] : [];
  const isRent = form.listing_type === 'rent';
  const atLimit = agent.listing_limit !== null && agent.listing_count >= agent.listing_limit;
  const editing = editingId !== null;
  const formOpen = editing || (!atLimit && (showForm || houses.length === 0));

  const numberInput = (field, min = 0) => (
    <input
      type="number"
      min={min}
      style={inputStyle}
      value={form[field]}
      onChange={update(field)}
    />
  );

  return (
    <PageWrapper>
      <h1 style={{ color: '#4f5c3f', margin: '0 0 6px' }}>Agent dashboard</h1>
      <p style={{ color: '#726f60', margin: '0 0 22px' }}>{agent.business_name}</p>

      {agent.is_verified ? (
        <div
          style={{
            background: '#eef3e6',
            border: '1px solid #8a9a76',
            borderRadius: '10px',
            padding: '14px 18px',
            marginBottom: '24px',
            fontSize: '14px',
            lineHeight: 1.6,
          }}
        >
          <strong>✓ Verified.</strong> Your approved listings are visible to everyone on the site. New
          listings still wait for our team's approval.
        </div>
      ) : (
        <div
          style={{
            background: '#fbf1dc',
            border: '1px solid #e0a845',
            borderRadius: '10px',
            padding: '14px 18px',
            marginBottom: '24px',
            fontSize: '14px',
            lineHeight: 1.6,
          }}
        >
          <strong>Verification pending.</strong> Our team will contact you on {agent.phone} to verify
          your identity and your business registration. You can prepare up to {agent.listing_limit}{' '}
          listings now ({agent.listing_count} of {agent.listing_limit} used), but nothing goes public
          until you're verified.
        </div>
      )}
      
      <IdentityBanner hidden={agent.is_verified} />

      {notice && (
        <div
          style={{
            background: notice.kind === 'good' ? '#eef3e6' : '#fbeee9',
            border: `1px solid ${notice.kind === 'good' ? '#8a9a76' : '#b85c3e'}`,
            borderRadius: '10px',
            padding: '14px 18px',
            marginBottom: '24px',
            fontSize: '14px',
            lineHeight: 1.6,
          }}
        >
          {notice.text}
        </div>
      )}

      <h2 style={{ color: '#4f5c3f', margin: '0 0 16px' }}>Your listings ({houses.length})</h2>

      {houses.length === 0 ? (
        <p style={{ color: '#726f60' }}>You haven't added any houses yet. Add your first one below.</p>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {houses.map((house) => (
            <ListingCard
              key={house.id}
              house={house}
              onChange={handleCardChange}
              onDeleted={handleCardDeleted}
              onEdit={startEdit}
            />
          ))}
        </div>
      )}

      <div style={{ marginTop: '44px' }}>
        {atLimit && !editing && (
          <p style={{ color: '#726f60', maxWidth: '560px', lineHeight: 1.7 }}>
            You've used all {agent.listing_limit} listings available before verification. Once our team
            has verified you, you can add more.
          </p>
        )}

        {!atLimit && !formOpen && (
          <button type="button" style={primaryBtn} onClick={() => setShowForm(true)}>
            + Add a new house
          </button>
        )}

        {formOpen && (
          <form ref={formRef} onSubmit={handleSubmit} style={{ maxWidth: '760px' }}>
            <h2 style={{ color: '#4f5c3f', margin: '0 0 12px' }}>
              {editing ? 'Edit your listing' : 'Add a new house'}
            </h2>

            {editing && (
              <div
                style={{
                  background: '#fbf1dc',
                  border: '1px solid #e0a845',
                  borderRadius: '10px',
                  padding: '14px 18px',
                  marginBottom: '14px',
                  fontSize: '14px',
                  lineHeight: 1.6,
                }}
              >
                <strong>You're editing a listing.</strong> When you save, it goes back to our team for
                review and won't show on the site until it's approved again. To change the photos, close
                this form and use the photo buttons on the listing.
              </div>
            )}

            <div
              style={{
                background: 'white',
                border: '1.5px dashed #b85c3e',
                borderRadius: '12px',
                padding: '14px 18px',
                fontSize: '14px',
                lineHeight: 1.6,
              }}
            >
              <strong>What buyers and renters see.</strong> Everyone sees the title, rent or sale,
              state, area, price, bedrooms, bathrooms, units and the cover photo. Everything else, like
              the street, description, details, other photos and your phone number, is shown only after
              someone unlocks the house.
            </div>

            <h3 style={sectionTitle}>The basics</h3>
            <label style={labelStyle}>Title</label>
            <input
              required
              style={inputStyle}
              value={form.title}
              onChange={update('title')}
              placeholder="e.g. 4-Bedroom Duplex, Ikoyi"
            />

            <label style={labelStyle}>Is it for rent or for sale?</label>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
              {[
                ['rent', 'For rent'],
                ['sale', 'For sale'],
              ].map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setForm({ ...form, listing_type: value })}
                  style={chipStyle(form.listing_type === value)}
                >
                  {label}
                </button>
              ))}
            </div>

            <h3 style={sectionTitle}>Where is it?</h3>
            <div style={grid}>
              <div>
                <label style={labelStyle}>State</label>
                <select required style={selectStyle} value={form.state} onChange={chooseState}>
                  <option value="">Select a state</option>
                  {Object.keys(locations).map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Area</label>
                <select
                  required
                  style={selectStyle}
                  value={form.area}
                  onChange={update('area')}
                  disabled={!form.state}
                >
                  <option value="">{form.state ? 'Select an area' : 'Choose a state first'}</option>
                  {areasOfState.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label style={labelStyle}>Street address (locked until someone unlocks)</label>
            <input
              required
              style={inputStyle}
              value={form.street}
              onChange={update('street')}
              placeholder="e.g. 12 Example Close"
            />

            <h3 style={sectionTitle}>Price</h3>
            <p style={hintStyle}>
              {isRent
                ? 'Enter the rent for the period you choose, in naira.'
                : 'Enter the full sale price, in naira.'}
            </p>
            <div style={grid}>
              <div>
                <label style={labelStyle}>{isRent ? 'Rent (₦)' : 'Price (₦)'}</label>
                {numberInput('price', 1)}
              </div>
              {isRent && (
                <div>
                  <label style={labelStyle}>Rent is paid</label>
                  <select style={selectStyle} value={form.rent_period} onChange={update('rent_period')}>
                    <option value="year">Per year</option>
                    <option value="month">Per month</option>
                  </select>
                </div>
              )}
              {isRent && (
                <div>
                  <label style={labelStyle}>Agency fee (₦, optional)</label>
                  {numberInput('agency_fee')}
                </div>
              )}
              <div>
                <label style={labelStyle}>Service charge per year (₦, optional)</label>
                {numberInput('service_charge')}
              </div>
            </div>

            <h3 style={sectionTitle}>Rooms</h3>
            <div style={grid}>
              <div>
                <label style={labelStyle}>Bedrooms</label>
                {numberInput('bedrooms')}
              </div>
              <div>
                <label style={labelStyle}>Bathrooms</label>
                {numberInput('bathrooms')}
              </div>
              <div>
                <label style={labelStyle}>Units available</label>
                {numberInput('units_available', 1)}
              </div>
              <div>
                <label style={labelStyle}>Living rooms</label>
                {numberInput('living_rooms')}
              </div>
              <div>
                <label style={labelStyle}>Kitchens</label>
                {numberInput('kitchens')}
              </div>
              <div>
                <label style={labelStyle}>Guest toilets</label>
                {numberInput('guest_toilets')}
              </div>
              <div>
                <label style={labelStyle}>Parking spaces</label>
                {numberInput('parking_spaces')}
              </div>
            </div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontWeight: 600,
                fontSize: '14px',
                margin: '0 0 18px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={form.has_boys_quarters}
                onChange={(e) => setForm({ ...form, has_boys_quarters: e.target.checked })}
                style={{ width: 'auto', margin: 0 }}
              />
              Has boys' quarters
            </label>

            <h3 style={sectionTitle}>Property details</h3>
            <div style={grid}>
              <div>
                <label style={labelStyle}>Property type</label>
                <select style={selectStyle} value={form.property_type} onChange={update('property_type')}>
                  <option value="">Select a type</option>
                  {options.property_types.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Furnishing</label>
                <select style={selectStyle} value={form.furnishing} onChange={update('furnishing')}>
                  {options.furnishing.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Title document</label>
                <select style={selectStyle} value={form.title_document} onChange={update('title_document')}>
                  <option value="">Select a document</option>
                  {options.title_documents.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Plot size (sqm, optional)</label>
                {numberInput('plot_size_sqm')}
              </div>
              <div>
                <label style={labelStyle}>Floor area (sqm, optional)</label>
                {numberInput('floor_area_sqm')}
              </div>
              <div>
                <label style={labelStyle}>Year built (optional)</label>
                {numberInput('year_built', 1900)}
              </div>
            </div>

            <h3 style={sectionTitle}>Features and amenities</h3>
            <p style={hintStyle}>Choose everything the house has.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
              {AMENITY_SUGGESTIONS.map((name) => (
                <button
                  type="button"
                  key={name}
                  onClick={() => toggleAmenity(name)}
                  style={chipStyle(amenities.includes(name))}
                >
                  {name}
                </button>
              ))}
            </div>
            <label style={labelStyle}>Anything else? (separate with commas)</label>
            <input
              style={inputStyle}
              value={otherAmenities}
              onChange={(e) => setOtherAmenities(e.target.value)}
              placeholder="e.g. Cinema room, Staff quarters"
            />

            <h3 style={sectionTitle}>Description</h3>
            <textarea
              required
              rows={5}
              minLength={30}
              style={inputStyle}
              value={form.description}
              onChange={update('description')}
              placeholder="Tell people about the house: the layout, the neighbourhood, what makes it special."
            />

            {!editing && (
              <>
                <h3 style={sectionTitle}>Photos</h3>
                <p style={hintStyle}>
                  Add at least {MIN_PHOTOS} photos (up to {MAX_PHOTOS}, {MAX_PHOTO_MB} MB each). The first
                  one is the cover photo that everyone sees, so make it the best view of the outside. Don't
                  include house numbers, street signs or phone numbers in the cover photo.
                </p>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={addPhotos}
                  style={{ ...inputStyle, padding: '10px' }}
                />

                {photos.length > 0 && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                      gap: '10px',
                      marginBottom: '18px',
                    }}
                  >
                    {photos.map((photo, index) => (
                      <div key={photo.url} style={{ position: 'relative' }}>
                        <img
                          src={photo.url}
                          alt=""
                          style={{
                            width: '100%',
                            height: '80px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            display: 'block',
                          }}
                        />
                        {index === 0 && (
                          <span
                            style={{
                              position: 'absolute',
                              left: '6px',
                              bottom: '6px',
                              background: '#4f5c3f',
                              color: 'white',
                              fontSize: '11px',
                              padding: '2px 7px',
                              borderRadius: '10px',
                            }}
                          >
                            Cover
                          </span>
                        )}
                        <button
                          type="button"
                          aria-label="Remove photo"
                          onClick={() => removePhoto(index)}
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            border: 'none',
                            background: 'rgba(0, 0, 0, 0.65)',
                            color: 'white',
                            cursor: 'pointer',
                            lineHeight: 1,
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {error && <p style={{ color: '#b85c3e', marginTop: 0 }}>{error}</p>}

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button type="submit" style={primaryBtn} disabled={busy}>
                {busy ? 'Saving…' : editing ? 'Save changes and send for review' : 'Save and send for review'}
              </button>
              {houses.length > 0 && (
                <button type="button" style={outlineBtn} onClick={closeForm} disabled={busy}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </PageWrapper>
  );
}

export default AgentDashboard;