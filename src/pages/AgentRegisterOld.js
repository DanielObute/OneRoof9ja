import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageWrapper from '../components/PageWrapper';
import { labelStyle, inputStyle, selectStyle, primaryBtn, outlineBtn } from '../styles';

const states = ['Lagos', 'Abuja'];
const idTypes = ["International passport", "Driver's licence", "Permanent voter's card"];

function AgentRegister() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    businessName: '',
    cacNumber: '',
    phone: '',
    email: '',
    password: '',
    state: '',
    areas: '',
    bio: '',
    nin: '',
    idType: '',
    idNumber: '',
  });
  const [idFront, setIdFront] = useState(null);
  const [idBack, setIdBack] = useState(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [selfie, setSelfie] = useState('');
  const [consent, setConsent] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOn(false);
  };

  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraOn]);

  useEffect(() => stopCamera, []);

  const startCamera = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      setSelfie('');
      setCameraOn(true);
    } catch (err) {
      setError('We could not open your camera. Please allow camera access in your browser and try again.');
    }
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    setSelfie(canvas.toDataURL('image/jpeg', 0.9));
    stopCamera();
  };

  const nextFromStep1 = (e) => {
    e.preventDefault();
    setError('');
    setStep(2);
  };

  const nextFromStep2 = (e) => {
    e.preventDefault();
    setError('');
    if (!/^\d{11}$/.test(form.nin)) {
      setError('Your NIN must be exactly 11 digits.');
      return;
    }
    if (!idFront) {
      setError('Please upload the front of your government ID.');
      return;
    }
    setStep(3);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!selfie) {
      setError('Please take your verification selfie.');
      return;
    }
    if (!consent) {
      setError('Please confirm your consent to continue.');
      return;
    }
    // Nothing is sent anywhere yet. We connect this to the backend later.
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <PageWrapper>
        <div style={{ textAlign: 'center', padding: '30px 0' }}>
          <h1 style={{ color: '#4f5c3f', marginBottom: '10px' }}>Application received</h1>
          <p style={{ color: '#726f60', maxWidth: '520px', margin: '0 auto 24px' }}>
            Thank you, {form.businessName}. Our team will check your identity documents and
            business details. You cannot list houses until you are fully verified.
          </p>
          <Link to="/">Back to homes</Link>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <h1 style={{ color: '#4f5c3f', margin: '0 0 6px' }}>Register as an agent</h1>
      <p style={{ color: '#726f60', margin: '0 0 8px' }}>
        We only list verified agents, so we check every identity carefully.
      </p>
      <p style={{ fontWeight: 600, color: '#b85c3e', margin: '0 0 28px' }}>
        Step {step} of 3 ·{' '}
        {step === 1 ? 'Business details' : step === 2 ? 'Identity documents' : 'Face verification'}
      </p>

      {step === 1 && (
        <form onSubmit={nextFromStep1} style={{ maxWidth: '560px' }}>
          <label style={labelStyle}>Business / agent name</label>
          <input required style={inputStyle} value={form.businessName} onChange={update('businessName')} />

          <label style={labelStyle}>CAC registration number</label>
          <input required style={inputStyle} value={form.cacNumber} onChange={update('cacNumber')} placeholder="e.g. RC 1234567" />

          <label style={labelStyle}>Phone</label>
          <input required style={inputStyle} value={form.phone} onChange={update('phone')} />

          <label style={labelStyle}>Email</label>
          <input required type="email" style={inputStyle} value={form.email} onChange={update('email')} />

          <label style={labelStyle}>Password</label>
          <input required type="password" minLength={8} style={inputStyle} value={form.password} onChange={update('password')} />

          <label style={labelStyle}>State you operate in</label>
          <select required style={selectStyle} value={form.state} onChange={update('state')}>
            <option value="">Select a state</option>
            {states.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <label style={labelStyle}>Neighbourhoods your houses are in</label>
          <input required style={inputStyle} value={form.areas} onChange={update('areas')} placeholder="e.g. Ikoyi, Banana Island, Lekki Phase 1" />

          <label style={labelStyle}>Short bio (optional)</label>
          <textarea rows={3} style={inputStyle} value={form.bio} onChange={update('bio')} />

          <button type="submit" style={primaryBtn}>Continue</button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={nextFromStep2} style={{ maxWidth: '560px' }}>
          <label style={labelStyle}>National Identification Number (NIN)</label>
          <input
            required
            inputMode="numeric"
            maxLength={11}
            style={inputStyle}
            value={form.nin}
            onChange={update('nin')}
            placeholder="11 digits"
          />

          <label style={labelStyle}>Government ID type</label>
          <select required style={selectStyle} value={form.idType} onChange={update('idType')}>
            <option value="">Select ID type</option>
            {idTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <label style={labelStyle}>ID number</label>
          <input required style={inputStyle} value={form.idNumber} onChange={update('idNumber')} />

          <label style={labelStyle}>Upload ID, front</label>
          <input
            type="file"
            accept="image/*"
            style={{ ...inputStyle, padding: '10px' }}
            onChange={(e) => setIdFront(e.target.files[0] || null)}
          />

          <label style={labelStyle}>Upload ID, back (if it has one)</label>
          <input
            type="file"
            accept="image/*"
            style={{ ...inputStyle, padding: '10px' }}
            onChange={(e) => setIdBack(e.target.files[0] || null)}
          />

          {error && <p style={{ color: '#b85c3e', marginTop: 0 }}>{error}</p>}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" style={outlineBtn} onClick={() => setStep(1)}>Back</button>
            <button type="submit" style={primaryBtn}>Continue</button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleSubmit} style={{ maxWidth: '560px' }}>
          <p style={{ marginTop: 0 }}>
            Take a clear selfie in good light. Look straight at the camera and hold your
            government ID beside your face, so we can match you to your documents.
          </p>

          <div
            style={{
              background: '#262f20',
              borderRadius: '12px',
              overflow: 'hidden',
              minHeight: '260px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            {cameraOn ? (
              <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', transform: 'scaleX(-1)' }} />
            ) : selfie ? (
              <img src={selfie} alt="Your selfie" style={{ width: '100%', transform: 'scaleX(-1)' }} />
            ) : (
              <p style={{ color: '#a9b88f' }}>Camera is off</p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            {cameraOn ? (
              <button type="button" style={primaryBtn} onClick={capture}>Take photo</button>
            ) : (
              <button type="button" style={outlineBtn} onClick={startCamera}>
                {selfie ? 'Retake photo' : 'Open camera'}
              </button>
            )}
          </div>

          <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '20px', fontSize: '14px' }}>
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              style={{ marginTop: '3px' }}
            />
            <span>
              I confirm these documents are mine, and I agree to OneRoof9ja checking them to verify
              my identity.
            </span>
          </label>

          {error && <p style={{ color: '#b85c3e', marginTop: 0 }}>{error}</p>}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" style={outlineBtn} onClick={() => { stopCamera(); setStep(2); }}>Back</button>
            <button type="submit" style={primaryBtn}>Submit application</button>
          </div>
        </form>
      )}
    </PageWrapper>
  );
}

export default AgentRegister;