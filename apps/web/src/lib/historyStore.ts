export interface LocalHistoryItem {
  id: string;
  query: string;
  kind: 'forward' | 'eligibility' | 'notification';
  timestamp: number;
  label?: string;
  explanation?: string;
  confidence?: number;
  confidence_reason?: string;
  synced: boolean;
}

const STORAGE_KEY = 'janpulse_local_history';
const PREFERENCE_KEY = 'janpulse_auth_preference';

export function getAuthPreference(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(PREFERENCE_KEY);
}

export function setAuthPreference(pref: 'guest' | 'authenticated') {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PREFERENCE_KEY, pref);
}

export function getLocalHistory(): LocalHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('Failed to parse local history:', e);
    return [];
  }
}

export function addLocalHistoryItem(
  item: Omit<LocalHistoryItem, 'id' | 'timestamp' | 'synced'>,
  isSynced: boolean = false
): LocalHistoryItem {
  if (typeof window === 'undefined') {
    return { ...item, id: 'temp', timestamp: Date.now(), synced: isSynced };
  }

  const existing = getLocalHistory();
  const newItem: LocalHistoryItem = {
    ...item,
    id: `loc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
    synced: isSynced,
  };

  // Prepend and cap at 50 items
  const updated = [newItem, ...existing.filter(i => i.query !== item.query)].slice(0, 50);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to write local history:', e);
  }

  return newItem;
}

export function clearLocalHistory() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export function getUnsyncedItems(): LocalHistoryItem[] {
  return getLocalHistory().filter(i => !i.synced);
}

export function markItemsAsSynced(ids: string[]) {
  if (typeof window === 'undefined') return;
  const existing = getLocalHistory();
  const idSet = new Set(ids);
  const updated = existing.map(item => {
    if (idSet.has(item.id)) {
      return { ...item, synced: true };
    }
    return item;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

