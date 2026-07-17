import { useState } from 'react';
import type { House } from '../types';
import { houseLabel } from '../logic';
import { useApp } from '../context';

// Fallback-fil i app/public/avatars/ dersom ingen Google-avatar er fanget ennå.
const AVATAR_FILE: Record<House, string> = {
  osterliveien: `${import.meta.env.BASE_URL}avatars/pappa.jpg`,
  raschsvei: `${import.meta.env.BASE_URL}avatars/omar.jpg`,
};

const INITIALS: Record<House, string> = {
  osterliveien: 'P',
  raschsvei: 'O',
};

export function HouseBadge({ house, size = 20 }: { house: House; size?: number }) {
  const { avatars } = useApp();
  const [failed, setFailed] = useState(false);

  // Prioritet: fanget Google-avatar → fil i public/avatars/ → farget initial.
  const src = avatars[house] || AVATAR_FILE[house];

  if (failed) {
    return (
      <span
        className={`house-badge house-badge-${house}`}
        style={{ width: size, height: size, fontSize: size * 0.52 }}
        title={houseLabel(house)}
        aria-label={houseLabel(house)}
      >
        {INITIALS[house]}
      </span>
    );
  }

  return (
    <img
      className={`house-badge house-badge-${house}`}
      style={{ width: size, height: size }}
      src={src}
      alt={houseLabel(house)}
      title={houseLabel(house)}
      onError={() => setFailed(true)}
      referrerPolicy="no-referrer"
    />
  );
}
