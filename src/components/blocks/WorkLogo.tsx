'use client';

import { useState } from 'react';

// Client logos come from Google's favicon service; some sites have none. Like the legacy site,
// fall back to the emoji when the image fails.
export function WorkLogo({ src, alt, fallback }: { src: string; alt: string; fallback?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return fallback ? <span aria-hidden="true">{fallback}</span> : null;
  // eslint-disable-next-line @next/next/no-img-element -- 80px third-party favicon; optimisation adds nothing
  return <img src={src} alt={alt} width={80} height={80} loading="lazy" className="rounded-8 object-contain" onError={() => setFailed(true)} />;
}
