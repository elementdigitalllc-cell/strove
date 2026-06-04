export function timeAgo(ts) {
  let parsed;
  if (typeof ts === 'string' && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(ts)) {
    parsed = new Date(ts + 'Z');
  } else {
    parsed = new Date(ts);
  }
  const seconds = Math.max(0, Math.floor((Date.now() - parsed.getTime()) / 1000));
  if (seconds < 60) return seconds + 's ago';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
  return Math.floor(seconds / 86400) + 'd ago';
}
