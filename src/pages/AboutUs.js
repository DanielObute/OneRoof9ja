import { Link } from 'react-router-dom';
import PageWrapper from '../components/PageWrapper';

const headingStyle = { color: '#4f5c3f', margin: '36px 0 10px' };
const textStyle = { color: '#3b3b30', lineHeight: 1.7, margin: '0 0 12px', maxWidth: '760px' };

function AboutUs() {
  return (
    <PageWrapper>
      <h1 style={{ color: '#4f5c3f', margin: '0 0 12px' }}>About OneRoof9ja</h1>
      <p style={{ ...textStyle, fontSize: '18px' }}>
        OneRoof9ja is a home for premium, verified properties in Nigeria's most sought-after
        neighbourhoods, starting with Lagos and Abuja.
      </p>

      <h2 style={headingStyle}>Why we exist</h2>
      <p style={textStyle}>
        Buying or renting a high-end home is a big decision, and too many people have been scammed
        by fake listings and fake agents. We built OneRoof9ja so that a serious buyer can trust
        what they see: real houses, listed by real, verified agents.
      </p>

      <h2 style={headingStyle}>How it works</h2>
      <p style={textStyle}>
        Browsing is free. You can see the location, price and a photo of every listing. When a
        house catches your eye, you pay a small one-time fee to unlock the full photo gallery, the
        exact street, the full description and the agent's contact details.
      </p>

      <h2 style={headingStyle}>How we verify agents</h2>
      <p style={textStyle}>
        Every agent must give us their business registration, their NIN and a valid government ID,
        and complete a face verification before they can list a single house. Every listing is
        then reviewed by our team before it goes live. If something doesn't check out, it doesn't
        appear on the site.
      </p>

      <h2 style={headingStyle}>Our name</h2>
      <p style={textStyle}>
        OneRoof9ja carries two ideas. One roof: a home for everyone under it. Our hut mark is a reminder of where home begins.
      </p>

      <div style={{ display: 'flex', gap: '24px', marginTop: '32px', alignItems: 'center' }}>
        <Link to="/" style={{ fontWeight: 700 }}>Browse homes</Link>
        <Link to="/agent/register" style={{ fontWeight: 700 }}>Become a verified agent</Link>
      </div>
    </PageWrapper>
  );
}

export default AboutUs;