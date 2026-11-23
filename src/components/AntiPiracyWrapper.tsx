'use client';

import React, { useEffect } from 'react';

export default function AntiPiracyWrapper({
  phoneNumber,
  children,
}: {
  phoneNumber: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const preventContext = (e: MouseEvent) => e.preventDefault();
    const preventCopy = (e: ClipboardEvent) => e.preventDefault();

    document.addEventListener('contextmenu', preventContext);
    document.addEventListener('copy', preventCopy);
    return () => {
      document.removeEventListener('contextmenu', preventContext);
      document.removeEventListener('copy', preventCopy);
    };
  }, []);

  const watermarkText = `${phoneNumber || 'GCE-PASS'} • PROTECTED`;
  const svg = `<svg xmlns='http://w3.org' width='260' height='140'><text x='10' y='80' fill='white' fill-opacity='0.06' font-family='sans-serif' font-size='13' font-weight='bold' transform='rotate(-26 130 70)'>${watermarkText}</text></svg>`;
  const bgUrl = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

  return (
    <div className="relative no-copy">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-40 select-none"
        style={{ backgroundImage: bgUrl, transform: 'translateZ(0)', willChange: 'transform' }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
