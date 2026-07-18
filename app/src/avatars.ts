import type { House } from './types';

// Delt avatar-laster: hver bilde-URL lastes KUN én gang (uansett hvor mange
// HouseBadge-er som viser den), med retry ved feil. Dette hindrer at 50+
// samtidige forespørsler til samme Google-bilde blir strupet (429) og at
// enkelt-badger blir hengende på en midlertidig feil.

type LoadState = 'pending' | 'ok' | 'fail';
const state = new Map<string, LoadState>();
const listeners = new Set<() => void>();
let version = 0;

function emit() {
  version += 1;
  listeners.forEach((l) => l());
}

export function subscribeAvatars(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getAvatarVersion(): number {
  return version;
}

export function ensureLoad(url: string): void {
  if (!url || state.has(url)) return;
  state.set(url, 'pending');
  const attempt = (n: number) => {
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      state.set(url, 'ok');
      emit();
    };
    img.onerror = () => {
      if (n < 4) {
        setTimeout(() => attempt(n + 1), 800 * (n + 1));
      } else {
        state.set(url, 'fail');
        emit();
      }
    };
    img.src = url;
  };
  attempt(0);
}

/** Første kandidat som har lastet ok, ellers null (fortsatt under lasting). */
export function firstOkAvatar(candidates: string[]): string | null {
  for (const url of candidates) {
    if (url && state.get(url) === 'ok') return url;
  }
  return null;
}

// Fallback-fil i public/avatars/. Cache-bust for å unngå en evt. cachet 404
// fra før filen ble deployet.
const FILE_VERSION = 'v3';
export const AVATAR_FILE: Record<House, string> = {
  osterliveien: `${import.meta.env.BASE_URL}avatars/pappa.jpg?${FILE_VERSION}`,
  raschsvei: `${import.meta.env.BASE_URL}avatars/omar.jpg?${FILE_VERSION}`,
};
