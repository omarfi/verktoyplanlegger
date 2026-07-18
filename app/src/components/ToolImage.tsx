import { useState } from 'react';

const ToolIcon = ({ size = 42 }: { size?: number }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M14.7 6.3a4 4 0 0 0-5-5l2.2 2.2-2.8 2.8-2.2-2.2a4 4 0 0 0 5 5l-7.8 7.8a2 2 0 0 0 2.8 2.8l7.8-7.8a4 4 0 0 0 5-5l-2.2 2.2-2.8-2.8 2.2-2.2Z" />
  </svg>
);

export function ToolImage({ src, alt = '', className = '' }: { src?: string; alt?: string; className?: string }) {
  const [brokenSrc, setBrokenSrc] = useState('');
  if (!src || brokenSrc === src) {
    return <span className={`tool-image-fallback ${className}`}><ToolIcon /></span>;
  }
  return <img className={className} src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setBrokenSrc(src)} />;
}

export function ToolGlyph({ size }: { size?: number }) {
  return <ToolIcon size={size} />;
}
