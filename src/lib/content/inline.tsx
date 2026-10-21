import { Fragment, type ReactNode } from 'react';

// The only inline markup content may use: *text* → gradient emphasis. Everything else is text,
// so nothing typed into a content field can become HTML.
export function renderInline(text: string): ReactNode {
  const parts = text.split(/\*([^*\n]+)\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <em key={i} className="text-gradient not-italic">
        {part}
      </em>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}
