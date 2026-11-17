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

  return (
    <div className="relative no-copy overflow-hidden">
      {/* Subtle diagonal repeating phone-number watermark */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-40 flex flex-wrap items-center justify-center gap-16 opacity-[0.06] select-none overflow-hidden"
      >
        {Array.from({ length: 24 }).map((_, i) => (
          <span
            key={i}
            className="text-sm font-bold tracking-widest text-white -rotate-30 whitespace-nowrap"
            style={{ transform: 'rotate(-28deg)' }}
          >
            {watermarkText}
          </span>
        ))}
      </div>

      <div className="relative z-10">{children}</div>
    </div>
  );
      }
