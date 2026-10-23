export const labelStyle = {
    display: 'block',
    fontWeight: 600,
    fontSize: '14px',
    marginBottom: '6px',
    color: '#2f2f26',
  };
  
  export const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    border: '1px solid #ddd3bd',
    borderRadius: '10px',
    fontSize: '15px',
    marginBottom: '18px',
    background: 'white',
    fontFamily: 'inherit',
  };
  
  export const selectStyle = {
    ...inputStyle,
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    paddingRight: '44px',
    cursor: 'pointer',
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='9' viewBox='0 0 14 9'%3E%3Cpath d='M1 1.5 L7 7.5 L13 1.5' fill='none' stroke='%234f5c3f' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 16px center',
  };
  
  export const primaryBtn = {
    background: '#4f5c3f',
    color: '#f7f3e9',
    border: 'none',
    padding: '13px 26px',
    borderRadius: '10px',
    fontWeight: 600,
    fontSize: '15px',
    cursor: 'pointer',
  };
  
  export const outlineBtn = {
    ...primaryBtn,
    background: 'transparent',
    color: '#4f5c3f',
    border: '1.5px solid #4f5c3f',
  };