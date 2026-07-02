import type { StoredIdentity } from '@/types';

const STORAGE_KEY = 'wcp_identity';

export function saveIdentity(identity: StoredIdentity): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
}

export function loadIdentity(): StoredIdentity | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredIdentity;
  } catch {
    return null;
  }
}

export function clearIdentity(): void {
  localStorage.removeItem(STORAGE_KEY);
}

const ADMIN_KEY = 'wcp_admin_authed';

export function setAdminAuthed(value: boolean): void {
  sessionStorage.setItem(ADMIN_KEY, value ? '1' : '0');
}

export function isAdminAuthed(): boolean {
  return sessionStorage.getItem(ADMIN_KEY) === '1';
}
