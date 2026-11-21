import { getTmdbImageUrl } from '../services/api';

function formatRuntime(runtime) {
  if (typeof runtime === 'string' && runtime.trim()) return runtime;
  const mins = Number(runtime);
  if (!mins || Number.isNaN(mins)) return '2h 0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatGenres(genres) {
  if (!genres) return 'Action | Drama';
  if (Array.isArray(genres)) {
    const names = genres
      .map((g) => (typeof g === 'string' ? g : g?.name))
      .filter(Boolean);
    return names.length > 0 ? names.slice(0, 2).join(' | ') : 'Action | Drama';
  }
  return String(genres);
}

function formatYear(movie) {
  if (movie?.year) return String(movie.year);
  if (movie?.release_date) {
    return String(movie.release_date).slice(0, 4);
  }
  return '2026';
}

export function normalizeMovie(raw) {
  if (!raw) return null;

  const posterUri =
    getTmdbImageUrl(raw.poster_path, 'w500') ||
    raw.poster ||
    'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg';

  const backdropUri =
    getTmdbImageUrl(raw.backdrop_path, 'w780') ||
    raw.backdrop ||
    posterUri;

  const castList = Array.isArray(raw.cast)
    ? raw.cast.slice(0, 8).map((c, index) => ({
        id: c.id || c._id || `cast-${index}`,
        name: c.name || 'Cast Member',
        avatar:
          getTmdbImageUrl(c.profile_path, 'w200') ||
          c.avatar ||
          'https://image.tmdb.org/t/p/w200/cckcYc2v0yh1tc9QjRelptcOBko.jpg',
      }))
    : [];

  return {
    id: String(raw._id || raw.id),
    title: raw.title || 'Untitled Movie',
    language: (raw.original_language || raw.language || 'ENGLISH').toUpperCase(),
    year: formatYear(raw),
    genre: formatGenres(raw.genres || raw.genre),
    duration: formatRuntime(raw.runtime ?? raw.duration),
    rating: Number(raw.vote_average ?? raw.rating ?? 7.5),
    pricePerSeat: Number(raw.showPrice ?? raw.pricePerSeat ?? 250),
    poster: posterUri,
    backdrop: backdropUri,
    synopsis:
      raw.overview ||
      raw.synopsis ||
      'Experience cinema with QuickShow.',
    cast: castList,
    dates: raw.dates || [],
    timings: raw.timings || [],
    bookedSeats: raw.bookedSeats || [],
  };
}