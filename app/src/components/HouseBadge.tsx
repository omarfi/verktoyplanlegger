import { useState } from 'react';
import type { House } from '../types';
import { houseLabel } from '../logic';

// Legg ekte bilder i app/public/avatars/ med disse filnavnene, så vises de
// automatisk i stedet for initial-sirklene.
const AVATAR_SRC: Record<House, string> = {
  osterliveien: `${import.meta.env.BASE_URL}avatars/pappa.jpg`,
  raschsvei: `${import.meta.env.BASE_URL}avatars/omar.jpg`,
};

const INITIALS: Record<House, string> = {
  osterliveien: 'P',
  raschsvei: 'O',
};

export function HouseBadge({ house, size = 20 }: { house: House; size?: number }) {
  const [failed, setFailed] = useState(false);

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
      src={AVATAR_SRC[house]}
      alt={houseLabel(house)}
      title={houseLabel(house)}
      onError={() => setFailed(true)}
    />
  );
}
