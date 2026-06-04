const KEY_PREFIX = 'strove_recent_searches_';
const MAX = 5;

function keyFor(userId) {
  return KEY_PREFIX + (userId || 'anon');
}

export function getRecentSearches(userId) {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(userId, profile) {
  if (!userId || !profile?.id) return getRecentSearches(userId);
  const slim = { id: profile.id, username: profile.username, full_name: profile.full_name };
  const current = getRecentSearches(userId).filter((p) => p.id !== slim.id);
  const next = [slim, ...current].slice(0, MAX);
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(next));
  } catch {
    /* quota / private mode — ignore */
  }
  return next;
}

export function removeRecentSearch(userId, profileId) {
  const next = getRecentSearches(userId).filter((p) => p.id !== profileId);
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function clearRecentSearches(userId) {
  try {
    localStorage.removeItem(keyFor(userId));
  } catch {
    /* ignore */
  }
}
