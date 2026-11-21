import axios from 'axios';

export const BASE_URL = 'https://movieshow-server-coral.vercel.app';
export const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p/w500';
export const TMDB_BACKDROP_BASE = 'https://image.tmdb.org/t/p/w780';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function getTmdbImageUrl(path, size = 'w500') {
  if (!path) return null;
  if (typeof path === 'string' && path.startsWith('http')) {
    return path;
  }
  const cleanPath = String(path).startsWith('/') ? path : `/${path}`;
  return `https://image.tmdb.org/t/p/${size}${cleanPath}`;
}

export async function fetchAllShows() {
  const res = await apiClient.get('/api/show/all');
  return res.data;
}

export async function fetchShowByMovieId(movieId) {
  const res = await apiClient.get(`/api/show/${movieId}`);
  return res.data;
}

export async function fetchOccupiedSeats(showId) {
  const res = await apiClient.get(`/api/booking/seats/${showId}`);
  return res.data;
}

export async function createBookingRequest(
  { showId, selectedSeats, amount, movieTitle, showTimeLabel },
  userId
) {
  const res = await apiClient.post(
    '/api/booking/create',
    {
      showId,
      selectedSeats,
      amount,
      movieTitle,
      showTimeLabel,
      userId,
      simulatedPayment: true,
    },
    {
      headers: userId ? { 'x-user-id': userId } : {},
    }
  );
  return res.data;
}

export async function fetchUserBookings(userId) {
  const res = await apiClient.get('/api/user/bookings', {
    headers: userId ? { 'x-user-id': userId } : {},
  });
  return res.data;
}

export default apiClient;