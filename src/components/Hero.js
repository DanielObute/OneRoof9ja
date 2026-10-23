import { useState, useEffect } from 'react';
import hero1 from '../assets/hero/hero1.jpg';
import hero2 from '../assets/hero/hero2.jpg';
import hero3 from '../assets/hero/hero3.jpg';
import hero4 from '../assets/hero/hero4.jpg';

const images = [hero1, hero2, hero3, hero4];

function Hero() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % images.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: -1 }}>
        {images.map((img, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${img})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: i === current ? 1 : 0,
              transition: 'opacity 1.5s ease-in-out',
            }}
          />
        ))}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.35)' }} />
      </div>

      <div
        style={{
          minHeight: 'calc(100vh - 131px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '0 24px',
          color: 'white',
        }}
      >
        <h1
          style={{
            fontSize: '52px',
            lineHeight: 1.15,
            margin: '0 0 18px',
            maxWidth: '800px',
            textShadow: '0 2px 12px rgba(0, 0, 0, 0.5)',
          }}
        >
          Find a home, anywhere in Nigeria
        </h1>
        <p
          style={{
            fontSize: '20px',
            maxWidth: '560px',
            margin: 0,
            textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
          }}
        >
          Browse premium, verified homes in Lagos and Abuja's top neighborhoods.
        </p>
      </div>
    </>
  );
}

export default Hero;