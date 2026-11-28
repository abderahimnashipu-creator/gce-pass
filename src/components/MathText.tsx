'use client';

import React from 'react';
import { InlineMath } from 'react-katex';

export default function MathText({ text }: { text: string }) {
  if (!text) return null;

  const parts = text.split(/(\$[^$]+\$)/g);

  return (
    <span className="whitespace-pre-wrap leading-relaxed">
      {parts.map((part, index) => {
        if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
          const formula = part.slice(1, -1);
          try {
            return <InlineMath key={index} math={formula} />;
          } catch {
            return <span key={index}>{part}</span>;
          }
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}
