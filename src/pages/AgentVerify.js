import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import PageWrapper from '../components/PageWrapper';
import { API, authHeaders, clearToken, firstError, isLoggedIn } from '../api';
import { labelStyle, inputStyle, selectStyle, primaryBtn, outlineBtn } from '../styles';

const MAX_FILE_MB = 10;

const DEMO_NINS = [
  { label: 'Passes every check', number: '11111111111' },
  { label: 'Face does not match', number: '22222222222' },
  { label: 'NIN not found', number: '33333333333' },
];

// The live check: the page takes three photos itself, one for each of these.
const POSES = [
  { label: 'Look straight at the camera', short: 'Straight', seconds: 3 },
  { label: 'Slowly turn your head to the LEFT', short: 'Left', seconds: 4 },
  { label: 'Slowly turn your head to the RIGHT', short: 'Right', seconds: 4 },
];
const PANEL_W = 480;
const PANEL_H = 360;
const LABEL_H = 30;

// One picture from the live video, cropped to a 4:3 panel.
function grabPanel(video) {
  const canvas = document.createElement('canvas');
  canvas.width = PANEL_W;
  canvas.height = PANEL_H;
  const scale = Math.max(PANEL_W / video.videoWidth, PANEL_H / video.videoHeight);
  const w = video.videoWidth * scale;
  const h = video.videoHeight * scale;
  canvas.getContext('2d').drawImage(video, (PANEL_W - w) / 2, (PANEL_H - h) / 2, w, h);
  return canvas;
}

// Joins the panels side by side into ONE picture, with a label under each one.
function joinPanels(panels) {
  const canvas = document.createElement('canvas');
  canvas.width = PANEL_W * panels.length;
  canvas.height = PANEL_H + LABEL_H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#262f20';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = '18px sans-serif';
  panels.forEach((panel, i) => {
    ctx.drawImage(panel, i * PANEL_W, 0);
    ctx.fillStyle = 'white';
    ctx.fillText(`${i + 1}. ${POSES[i].short}`, i * PANEL_W + 10, PANEL_H + 21);
  });
  return canvas;
}

const box = (background, border) => ({
  background,
  border: `1px solid ${border}`,
  borderRadius: '10px',
  padding: '14px 18px',
  marginBottom: '22px',
  fontSize: '14px',
  lineHeight: 1.6,
});

const demoChip = {
  background: 'white',
  border: '1.5px solid #ddd3bd',
  borderRadius: '10px',
  padding: '8px 12px',
  textAlign: 'left',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: '12px',
  color: '#2f2f26',
  lineHeight: 1.5,
};

const stepNames = ['Your details', 'ID photos', 'Live selfie'];

// returns a message if the file is not usable, or '' if it is fine
const checkPicture = (file) => {
  if (!file.type.startsWith('image/')) return `${file.name} isn't a picture.`;
  if (file.size > MAX_FILE_MB * 1024 * 1024) return `${file.name} is bigger than ${MAX_FILE_MB} MB.`;
  return '';
};

function AgentVerify() {
  const [phase, setPhase] = useState('loading'); // loading | login | notagent | error | ready
  const [info, setInfo] = useState(null); // where the identity check stands, from the server
  const [step, setStep] = useState(1);

  const [nin, setNin] = useState('');
  const [idType, setIdType] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [idFront, setIdFront] = useState(null); // { file, url }
  const [idBack, setIdBack] = useState(null);
  const [selfie, setSelfie] = useState(null); // the joined live pictures, { file, url }
  const [consent, setConsent] = useState(false);

  // the live check
  const [cameraOn, setCameraOn] = useState(false);
  const [stage, setStage] = useState('idle'); // idle | running | done
  const [poseIndex, setPoseIndex] = useState(0);
  const [count, setCount] = useState(0);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const panelsRef = useRef([]);

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      setPhase('login');
      return undefined;
    }
    let cancelled = false;
    fetch(`${API}/dashboard/identity/`, { headers: authHeaders() })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) {
          clearToken();
          setPhase('login');
          return;
        }
        if (res.status === 403) {
          setPhase('notagent');
          return;
        }
        if (!res.ok) throw new Error('Server error');
        setInfo(await res.json());
        setPhase('ready');
      })
      .catch(() => {
        if (!cancelled) setPhase('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // connect the camera picture to the video box once it is on screen
  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraOn]);

  // switch the camera off when leaving the page
  useEffect(
    () => () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    },
    []
  );

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOn(false);
  };

  const keep = (current, setter, file) => {
    if (current) URL.revokeObjectURL(current.url);
    setter({ file, url: URL.createObjectURL(file) });
  };

  // The live check runs by itself: a countdown for each pose, then the page takes the photo.
  useEffect(() => {
    if (stage !== 'running') return undefined;

    const timer = setTimeout(() => {
      if (count > 1) {
        setCount(count - 1);
        return;
      }

      const video = videoRef.current;
      if (!video || !video.videoWidth) {
        stopCamera();
        setStage('idle');
        setError('The camera was not ready. Please try again.');
        return;
      }
      panelsRef.current.push(grabPanel(video));

      if (poseIndex < POSES.length - 1) {
        setPoseIndex(poseIndex + 1);
        setCount(POSES[poseIndex + 1].seconds);
        return;
      }

      // all the photos are taken: join them into the one selfie
      joinPanels(panelsRef.current).toBlob(
        (blob) => {
          stopCamera();
          if (!blob) {
            setStage('idle');
            setError('We could not save the photos. Please try again.');
            return;
          }
          keep(selfie, setSelfie, new File([blob], 'selfie.jpg', { type: 'image/jpeg' }));
          setStage('done');
        },
        'image/jpeg',
        0.88
      );
    }, 1000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, count, poseIndex]);

  const startLive = async () => {
    setError('');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('This browser cannot open the camera here. Please use a current Chrome, Edge or Safari.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      panelsRef.current = [];
      if (selfie) {
        URL.revokeObjectURL(selfie.url);
        setSelfie(null);
      }
      setPoseIndex(0);
      setCount(POSES[0].seconds);
      setCameraOn(true);
      setStage('running');
    } catch (err) {
      setError(
        "We couldn't open your camera. Allow camera access in your browser and try again. A live camera check is required."
      );
    }
  };

  const cancelLive = () => {
    stopCamera();
    panelsRef.current = [];
    setStage('idle');
  };

  const pickPicture = (current, setter) => (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const problem = checkPicture(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError('');
    keep(current, setter, file);
  };

  const nextFromDetails = (e) => {
    e.preventDefault();
    setError('');
    if (!/^\d{11}$/.test(nin.replace(/\D/g, ''))) {
      setError('A NIN has exactly 11 digits.');
      return;
    }
    if (!idType) {
      setError('Choose the type of ID you are uploading.');
      return;
    }
    if (idNumber.replace(/\s/g, '').length < 5) {
      setError('Enter the number printed on your ID.');
      return;
    }
    setStep(2);
  };

  const nextFromPhotos = (e) => {
    e.preventDefault();
    setError('');
    if (!idFront) {
      setError('Upload the front of your ID.');
      return;
    }
    setStep(3);
  };

  const resetForm = () => {
    [idFront, idBack, selfie].forEach((p) => p && URL.revokeObjectURL(p.url));
    stopCamera();
    panelsRef.current = [];
    setStage('idle');
    setNin('');
    setIdType('');
    setIdNumber('');
    setIdFront(null);
    setIdBack(null);
    setSelfie(null);
    setConsent(false);
    setStep(1);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!selfie) {
      setError('Please complete the live selfie check first.');
      return;
    }
    if (!consent) {
      setError('Please confirm your consent to continue.');
      return;
    }

    setBusy(true);
    try {
      const body = new FormData();
      body.append('nin', nin.replace(/\D/g, ''));
      body.append('id_type', idType);
      body.append('id_number', idNumber.trim());
      body.append('consent', 'true');
      body.append('id_front', idFront.file);
      if (idBack) body.append('id_back', idBack.file);
      body.append('selfie', selfie.file, 'selfie.jpg');

      const res = await fetch(`${API}/dashboard/identity/`, {
        method: 'POST',
        headers: authHeaders(), // no Content-Type: the browser sets it for file uploads
        body,
      });
      const data = await res.json().catch(() => null);

      if (res.status === 401) {
        clearToken();
        setPhase('login');
        return;
      }
      if (!res.ok) {
        setError(firstError(data));
        return;
      }

      resetForm();
      setInfo(data);
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
        <p>Loading…</p>
      </PageWrapper>
    );
  }

  if (phase === 'login') {
    return (
      <PageWrapper>
        <h1 style={{ color: '#4f5c3f', margin: '0 0 10px' }}>Verify your identity</h1>
        <p style={{ margin: '0 0 20px', color: '#726f60' }}>Log in with your agent account to continue.</p>
        <Link to="/login" state={{ from: '/agent/verify' }} style={{ fontWeight: 700, color: '#4f5c3f' }}>
          Log in →
        </Link>
      </PageWrapper>
    );
  }

  if (phase === 'notagent') {
    return (
      <PageWrapper>
        <h1 style={{ color: '#4f5c3f', margin: '0 0 10px' }}>Verify your identity</h1>
        <p style={{ maxWidth: '560px', lineHeight: 1.7 }}>
          This isn't an agent account, so there is nothing to verify. To list houses, register as an agent
          with a different email address.
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
          We couldn't load this page. Make sure the backend is running, then refresh.
        </p>
      </PageWrapper>
    );
  }

  const backLink = (
    <p style={{ margin: '26px 0 0' }}>
      <Link to="/agent/dashboard" style={{ fontWeight: 700, color: '#4f5c3f' }}>
        ← Back to your dashboard
      </Link>
    </p>
  );

  if (info.status === 'approved') {
    return (
      <PageWrapper>
        <h1 style={{ color: '#4f5c3f', margin: '0 0 12px' }}>Verify your identity</h1>
        <div style={box('#eef3e6', '#8a9a76')}>
          <strong>✓ Your identity is verified.</strong> Thank you. You can now have listings approved.
        </div>
        {backLink}
      </PageWrapper>
    );
  }

  if (info.status === 'submitted') {
    return (
      <PageWrapper>
        <h1 style={{ color: '#4f5c3f', margin: '0 0 12px' }}>Verify your identity</h1>
        <div style={box('#fbf1dc', '#e0a845')}>
          <strong>Submitted. Our team is checking your documents.</strong> You'll be verified once they
          approve it. You don't need to do anything else.
        </div>
        <p style={{ margin: '0 0 6px', color: '#726f60', fontSize: '14px' }}>
          ID: {info.id_type_label} (ending {info.id_number_last4}) · NIN ending {info.nin_last4}
        </p>
        <p style={{ margin: 0, color: '#726f60', fontSize: '14px' }}>
          Automated check (test mode): {info.provider_result_label}, face match {info.face_match_score}%
        </p>
        {backLink}
      </PageWrapper>
    );
  }

  if (info.status === 'rejected' && !info.can_submit) {
    return (
      <PageWrapper>
        <h1 style={{ color: '#4f5c3f', margin: '0 0 12px' }}>Verify your identity</h1>
        <div style={box('#fbeee9', '#b85c3e')}>
          <strong>Not approved.</strong> {info.rejection_reason} You have used all of your attempts, so
          please contact the OneRoof9ja team.
        </div>
        {backLink}
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <h1 style={{ color: '#4f5c3f', margin: '0 0 6px' }}>Verify your identity</h1>
      <p style={{ color: '#726f60', margin: '0 0 20px' }}>
        We only list verified agents. This takes about two minutes.
      </p>

      {info.status === 'rejected' && (
        <div style={box('#fbeee9', '#b85c3e')}>
          <strong>Your last try was not approved.</strong> {info.rejection_reason} You have{' '}
          {info.attempts_left} attempt{info.attempts_left === 1 ? '' : 's'} left.
        </div>
      )}

      <div style={box('#fbf1dc', '#e0a845')}>
        <strong>TEST MODE.</strong> The identity check is a pretend one. Never type your real NIN or upload
        your real documents. Use a demo NIN below and any sample pictures for the ID. The live selfie uses
        your camera for real, but in test mode the "face match" result simply follows the demo NIN, and no
        real face comparison happens.
      </div>

      <p style={{ fontWeight: 600, color: '#b85c3e', margin: '0 0 22px' }}>
        Step {step} of 3 · {stepNames[step - 1]}
      </p>

      {step === 1 && (
        <form onSubmit={nextFromDetails} style={{ maxWidth: '560px' }}>
          <label style={labelStyle}>National Identification Number (NIN)</label>
          <input
            inputMode="numeric"
            autoComplete="off"
            maxLength={11}
            placeholder="11 digits"
            style={inputStyle}
            value={nin}
            onChange={(e) => setNin(e.target.value.replace(/\D/g, ''))}
          />
          <p style={{ margin: '-8px 0 8px', fontSize: '12px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#726f60' }}>
            Demo NINs (click one to fill it in)
          </p>
          <div style={{ display: 'grid', gap: '8px', marginBottom: '8px' }}>
            {DEMO_NINS.map((demo) => (
              <button type="button" key={demo.number} style={demoChip} onClick={() => setNin(demo.number)}>
                <strong>{demo.label}</strong>
                <br />
                {demo.number}
              </button>
            ))}
          </div>
          <p style={{ margin: '0 0 22px', fontSize: '12px', color: '#726f60' }}>
            Each agent needs a different number, so change the last digit (11111111112, 11111111113…).
            One NIN can only be used on one account.
          </p>

          <label style={labelStyle}>Type of government ID</label>
          <select style={selectStyle} value={idType} onChange={(e) => setIdType(e.target.value)}>
            <option value="">Select the ID you will upload</option>
            {(info.id_types || []).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <label style={labelStyle}>Number on the ID</label>
          <input
            autoComplete="off"
            style={inputStyle}
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            placeholder="e.g. A12345678"
          />

          {error && <p style={{ color: '#b85c3e', marginTop: 0 }}>{error}</p>}
          <button type="submit" style={primaryBtn}>
            Continue
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={nextFromPhotos} style={{ maxWidth: '560px' }}>
          <p style={{ marginTop: 0, lineHeight: 1.7 }}>
            Take or upload clear photos of your ID, flat, in good light, with all four corners showing and no
            glare.
          </p>

          <label style={labelStyle}>Front of the ID (required)</label>
          <input
            type="file"
            accept="image/*"
            style={{ ...inputStyle, padding: '10px' }}
            onChange={pickPicture(idFront, setIdFront)}
          />
          {idFront && (
            <img
              src={idFront.url}
              alt="Front of your ID"
              style={{ maxWidth: '220px', borderRadius: '8px', display: 'block', margin: '-8px 0 18px' }}
            />
          )}

          <label style={labelStyle}>Back of the ID (if it has one)</label>
          <input
            type="file"
            accept="image/*"
            style={{ ...inputStyle, padding: '10px' }}
            onChange={pickPicture(idBack, setIdBack)}
          />
          {idBack && (
            <img
              src={idBack.url}
              alt="Back of your ID"
              style={{ maxWidth: '220px', borderRadius: '8px', display: 'block', margin: '-8px 0 18px' }}
            />
          )}

          {error && <p style={{ color: '#b85c3e', marginTop: 0 }}>{error}</p>}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" style={outlineBtn} onClick={() => { setError(''); setStep(1); }}>
              Back
            </button>
            <button type="submit" style={primaryBtn}>
              Continue
            </button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={submit} style={{ maxWidth: '560px' }}>
          <p style={{ marginTop: 0, lineHeight: 1.7 }}>
            This is a <strong>live check</strong>. Your camera opens and the page takes three photos by itself:
            looking straight, then turned left, then turned right. You can't upload a selfie. Stay in good
            light with nothing covering your face.
          </p>

          <div
            style={{
              position: 'relative',
              background: '#262f20',
              borderRadius: '12px',
              overflow: 'hidden',
              minHeight: '240px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '14px',
            }}
          >
            {cameraOn && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', transform: 'scaleX(-1)' }}
              />
            )}
            {stage === 'running' && (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0, 0, 0, 0.6)',
                  color: 'white',
                  textAlign: 'center',
                  padding: '12px 10px 14px',
                }}
              >
                <div style={{ fontSize: '13px', opacity: 0.8, marginBottom: '4px' }}>
                  Photo {poseIndex + 1} of {POSES.length}
                </div>
                <div style={{ fontSize: '17px', fontWeight: 700 }}>{POSES[poseIndex].label}</div>
                <div style={{ fontSize: '34px', fontWeight: 700, lineHeight: 1.2 }}>{count}</div>
              </div>
            )}
            {stage === 'done' && selfie && (
              <img src={selfie.url} alt="Your three live photos" style={{ width: '100%', display: 'block' }} />
            )}
            {stage === 'idle' && !selfie && <p style={{ color: '#a9b88f' }}>Camera is off</p>}
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {stage === 'running' ? (
              <button type="button" style={outlineBtn} onClick={cancelLive}>
                Cancel
              </button>
            ) : (
              <button type="button" style={stage === 'done' ? outlineBtn : primaryBtn} onClick={startLive}>
                {stage === 'done' ? 'Retake the live check' : 'Start the live check'}
              </button>
            )}
          </div>

          <label
            style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
              marginBottom: '20px',
              fontSize: '14px',
              lineHeight: 1.5,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              style={{ width: 'auto', margin: '3px 0 0' }}
            />
            <span>
              I confirm these documents are mine, and I agree to OneRoof9ja checking them, and keeping them
              securely, to verify my identity.
            </span>
          </label>

          {error && <p style={{ color: '#b85c3e', marginTop: 0 }}>{error}</p>}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              style={outlineBtn}
              onClick={() => {
                cancelLive();
                setError('');
                setStep(2);
              }}
              disabled={busy}
            >
              Back
            </button>
            <button type="submit" style={primaryBtn} disabled={busy || stage === 'running'}>
              {busy ? 'Submitting…' : 'Submit for verification'}
            </button>
          </div>
        </form>
      )}
    </PageWrapper>
  );
}

export default AgentVerify;