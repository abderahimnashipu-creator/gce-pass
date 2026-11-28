'use client';

import React from 'react';
import { InlineMath } from 'react-katex';

export default function MathText({ text }: { text: string }) {
  if (!text) return null;

  const blocks = text.split(/(<svg[\s\S]*?<\/svg>|<table[\s\S]*?<\/table>)/gi);

  return (
    <span className="whitespace-pre-wrap leading-relaxed">
      {blocks.map((block, bIdx) => {
        if (/^<(svg|table)\b/i.test(block.trim())) {
          return (
            <span
              key={bIdx}
              className="my-2.5 block max-w-full overflow-x-auto rounded-xl border border-slate-700 bg-white p-3 text-slate-900 [&_svg]:mx-auto [&_svg]:max-h-56 [&_svg]:w-auto [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs [&_td]:border [&_td]:border-slate-400 [&_td]:px-2 [&_td]:py-1 [&_td]:text-center [&_th]:border [&_th]:border-slate-400 [&_th]:bg-slate-100 [&_th]:px-2 [&_th]:py-1 [&_th]:text-center"
              dangerouslySetInnerHTML={{ __html: block }}
            />
          );
        }

        const parts = block.split(/(\$[^$]+\$)/g);
        return (
          <React.Fragment key={bIdx}>
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
          </React.Fragment>
        );
      })}
    </span>
  );
}
