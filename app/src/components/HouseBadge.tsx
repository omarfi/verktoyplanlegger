import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { House } from '../types';
import { houseLabel } from '../logic';
import { useApp } from '../context';
import {
  AVATAR_FILE,
  ensureLoad,
  firstOkAvatar,
  getAvatarVersion,
  subscribeAvatars,
} from '../avatars';

export function HouseBadge({ house, size = 20 }: { house: House; size?: number }) {
  const { avatars } = useApp();

  // Prioritet: fanget Google-avatar (Firestore) → fil i public/avatars/.
  const candidates = useMemo(
    () => [avatars[house] || '', AVATAR_FILE[house]].filter(Boolean),
    [avatars, house]
  );

  // Start lasting av hver kandidat én gang (delt på tvers av alle badger).
  useEffect(() => {
    candidates.forEach(ensureLoad);
  }, [candidates]);

  // Re-render når en delt avatar er ferdig lastet.
  useSyncExternalStore(subscribeAvatars, getAvatarVersion);

  const src = firstOkAvatar(candidates);

  return (
    <span
      className={`house-badge house-badge-${house}`}
      style={{ width: size, height: size }}
      title={houseLabel(house)}
      aria-label={houseLabel(house)}
    >
      {src && (
        <img
          src={src}
          alt={houseLabel(house)}
          referrerPolicy="no-referrer"
          style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
        />
      )}
    </span>
  );
}
