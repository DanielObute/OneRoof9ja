export const API = 'http://127.0.0.1:8000/api';

// The login "key" is kept in the browser, so people stay logged in after a refresh.
const TOKEN_KEY = 'oneroof_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const saveToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);
export const isLoggedIn = () => !!getToken();

// Add this to a request so the backend knows who is asking.
export function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Token ${token}` } : {};
}

// Turns a house from the backend into the shape HouseCard expects.
export function toCardHouse(h) {
  return {
    ...h,
    coverImage: h.cover_image || 'https://placehold.co/400x260?text=No+photo',
    verified: true,
  };
}

// Pulls a readable message out of an error reply from Django.
export function firstError(data) {
  if (!data) return 'Something went wrong. Please try again.';
  if (typeof data === 'string') return data;
  const first = Object.values(data)[0];
  if (Array.isArray(first)) return first[0];
  if (typeof first === 'string') return first;
  return 'Something went wrong. Please try again.';
}

// Formats a price for display: "₦25,000,000 per year" for rentals, "₦380,000,000" for sales.
export function formatPrice(house) {
    const amount = `₦${Number(house.price).toLocaleString()}`;
    return house.price_suffix ? `${amount} ${house.price_suffix}` : amount;
  }