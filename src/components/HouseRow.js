import { useRef, useState, useEffect, useCallback } from 'react';
import HouseCard from './HouseCard';

const CARD_WIDTH = 290;

const arrowStyle = (side, visible) => ({
  position: 'absolute',
  top: '45%',
  [side]: '-12px',
  transform: 'translateY(-50%)',
  width: '44px',
  height: '44px',
  borderRadius: '50%',
  border: 'none',
  background: '#4f5c3f',
  color: '#f7f3e9',
  fontSize: '26px',
  lineHeight: 1,
  paddingBottom: '3px',
  cursor: 'pointer',
  boxShadow: '0 6px 16px rgba(0, 0, 0, 0.3)',
  zIndex: 2,
  opacity: visible ? 1 : 0,
  pointerEvents: visible ? 'auto' : 'none',
  transition: 'opacity 0.15s ease',
});

// The houses in ONE row that scrolls sideways, however many there are.
// Swipe or use the trackpad, or click the arrows.
function HouseRow({ houses }) {
  const scroller = useRef(null);
  const [canGoLeft, setCanGoLeft] = useState(false);
  const [canGoRight, setCanGoRight] = useState(false);

  // work out which arrows are needed: one only shows when there is more to see that way
  const update = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setCanGoLeft(el.scrollLeft > 4);
    setCanGoRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  // a new list of houses (for example after a filter) starts again from the left
  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = 0;
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [houses, update]);

  const scrollBy = (direction) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.max(el.clientWidth * 0.8, CARD_WIDTH), behavior: 'smooth' });
  };

  return (
    <div style={{ position: 'relative' }}>
      <button type="button" aria-label="Scroll left" onClick={() => scrollBy(-1)} style={arrowStyle('left', canGoLeft)}>
        ‹
      </button>

      <div
        ref={scroller}
        onScroll={update}
        style={{
          display: 'flex',
          gap: '20px',
          overflowX: 'auto',
          scrollSnapType: 'x proximity',
          padding: '8px 4px 28px',
          scrollbarWidth: 'thin',
        }}
      >
        {houses.map((house) => (
          <div key={house.id} style={{ flex: `0 0 ${CARD_WIDTH}px`, scrollSnapAlign: 'start' }}>
            <HouseCard house={house} />
          </div>
        ))}
      </div>

      <button type="button" aria-label="Scroll right" onClick={() => scrollBy(1)} style={arrowStyle('right', canGoRight)}>
        ›
      </button>
    </div>
  );
}

export default HouseRow;