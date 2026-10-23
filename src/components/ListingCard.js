import { useState } from 'react';
import { API, authHeaders, firstError, formatPrice } from '../api';

const MIN_PHOTOS = 4;
const MAX_PHOTO_MB = 10;

const STATUS_LOOK = {
  pending: { background: '#e0a845', color: '#2f2f26' },
  approved: { background: '#4f5c3f', color: '#ffffff' },
  rejected: { background: '#b85c3e', color: '#ffffff' },
};

const smallBtn = {
  background: 'transparent',
  border: '1.5px solid #4f5c3f',
  color: '#4f5c3f',
  borderRadius: '8px',
  padding: '7px 14px',
  fontWeight: 600,
  fontSize: '13px',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

function ListingCard({ house, onChange, onDeleted, onEdit }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const isRent = house.listing_type === 'rent';
  const look = STATUS_LOOK[house.status] || STATUS_LOOK.pending;
  const photoCount = house.images.length;

  const addPhotos = async (e) => {
    const files = Array.from(e.target.files);
    e.target.value = '';
    if (files.length === 0) return;

    const tooBig = files.find((f) => f.size > MAX_PHOTO_MB * 1024 * 1024);
    if (tooBig) {
      setMessage(`${tooBig.name} is bigger than ${MAX_PHOTO_MB} MB.`);
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      const body = new FormData();
      files.forEach((f) => body.append('images', f));
      const res = await fetch(`${API}/dashboard/houses/${house.id}/images/`, {
        method: 'POST',
        headers: authHeaders(), // no Content-Type here: the browser sets it for file uploads
        body,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage(firstError(data));
        return;
      }
      onChange(data);
    } catch (err) {
      setMessage("We couldn't upload the photos. Make sure the backend is running.");
    } finally {
      setBusy(false);
    }
  };

  const removePhoto = async (imageId) => {
    if (!window.confirm('Remove this photo?')) return;
    setBusy(true);
    setMessage('');
    try {
      const res = await fetch(`${API}/dashboard/houses/${house.id}/images/${imageId}/`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage(firstError(data));
        return;
      }
      onChange(data);
    } catch (err) {
      setMessage("We couldn't remove the photo. Make sure the backend is running.");
    } finally {
      setBusy(false);
    }
  };

  const deleteListing = async () => {
    if (!window.confirm(`Delete "${house.title}"? This can't be undone.`)) return;
    setBusy(true);
    setMessage('');
    try {
      const res = await fetch(`${API}/dashboard/houses/${house.id}/`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.ok) {
        onDeleted(house.id);
        return;
      }
      const data = await res.json().catch(() => null);
      setMessage(firstError(data));
    } catch (err) {
      setMessage("We couldn't delete the listing. Make sure the backend is running.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        background: 'white',
        borderRadius: '12px',
        padding: '16px',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)',
      }}
    >
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <img
          src={house.cover_image || 'https://placehold.co/320x220?text=No+photo'}
          alt=""
          style={{ width: '160px', height: '110px', objectFit: 'cover', borderRadius: '8px' }}
        />

        <div style={{ flex: 1, minWidth: '220px' }}>
          <p style={{ fontWeight: 700, margin: '0 0 4px' }}>{house.title}</p>
          <p style={{ margin: '0 0 4px', color: '#726f60', fontSize: '14px' }}>
            {isRent ? 'For rent' : 'For sale'} · {house.area}, {house.state} · {house.bedrooms} bed ·{' '}
            {house.bathrooms} bath
          </p>
          <p style={{ margin: 0, fontWeight: 600 }}>{formatPrice(house)}</p>
          {house.unlock_count > 0 && (
            <p style={{ margin: '6px 0 0', color: '#726f60', fontSize: '13px' }}>
              Unlocked {house.unlock_count} time{house.unlock_count === 1 ? '' : 's'}
            </p>
          )}
        </div>

        <span
          style={{
            ...look,
            fontSize: '12px',
            fontWeight: 700,
            padding: '5px 12px',
            borderRadius: '999px',
          }}
        >
          {house.status_label}
        </span>
      </div>

      {house.status === 'pending' && (
        <p style={{ margin: '14px 0 0', fontSize: '13px', color: '#726f60' }}>
          Waiting for our team to review this listing. It isn't visible on the site yet.
        </p>
      )}
      {house.status === 'approved' && (
        <p style={{ margin: '14px 0 0', fontSize: '13px', color: '#726f60' }}>
          This listing is live. Editing it, or adding or removing photos, sends it back for review.
        </p>
      )}
      {house.status === 'rejected' && (
        <p style={{ margin: '14px 0 0', fontSize: '13px', color: '#b85c3e' }}>
          This listing was not approved. Please contact the OneRoof9ja team to find out why. If something is wrong, you can fix it with Edit details and send it again.
        </p>
      )}
      {photoCount < MIN_PHOTOS && (
        <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#b85c3e' }}>
          Add at least {MIN_PHOTOS} photos so this listing can be approved.
        </p>
      )}

      {photoCount > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
            gap: '10px',
            margin: '16px 0 4px',
          }}
        >
          {house.images.map((img) => (
            <div key={img.id} style={{ position: 'relative' }}>
              <img
                src={img.image}
                alt=""
                style={{
                  width: '100%',
                  height: '80px',
                  objectFit: 'cover',
                  borderRadius: '8px',
                  display: 'block',
                }}
              />
              {img.is_cover && (
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
                disabled={busy}
                onClick={() => removePhoto(img.id)}
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

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginTop: '14px' }}>
        <label style={{ ...smallBtn, display: 'inline-block' }}>
          {busy ? 'Working…' : '+ Add photos'}
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={busy}
            onChange={addPhotos}
            style={{ display: 'none' }}
          />
        </label>
        <button type="button" disabled={busy} onClick={() => onEdit(house)} style={smallBtn}>
          Edit details
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={deleteListing}
          style={{ ...smallBtn, borderColor: '#b85c3e', color: '#b85c3e' }}
        >
          Delete listing
        </button>
      </div>

      {message && <p style={{ margin: '12px 0 0', color: '#b85c3e', fontSize: '14px' }}>{message}</p>}
    </div>
  );
}

export default ListingCard;