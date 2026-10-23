import Scenery from './Scenery';

function PageWrapper({ children }) {
  return (
    <div
      style={{
        background:
          'radial-gradient(ellipse at 50% 0%, #5d6b4c 0%, #3a4630 45%, #262f20 100%)',
        backgroundAttachment: 'fixed',
        minHeight: 'calc(100vh - 131px)',
        display: 'flex',
        flexDirection: 'column',
        padding: '40px 32px 0',
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
        <div style={{ padding: '44px 52px' }}>{children}</div>
      </div>

      <Scenery />
    </div>
  );
}

export default PageWrapper;