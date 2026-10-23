import type { z } from 'zod';

// Plain-English messages for zod's built-in checks; these reach admins and visitors through form errors.
// Schemas with their own message keep it (zod only asks this map when none was given).
export const zodMessages: z.core.$ZodErrorMap = (issue) => {
  switch (issue.code) {
    case 'invalid_type':
      return issue.input === undefined || issue.input === null ? 'Required' : undefined;
    case 'too_small':
      if (issue.origin === 'string') return Number(issue.minimum) <= 1 ? 'Required' : `Must be at least ${issue.minimum} characters`;
      if (issue.origin === 'array') return `Add at least ${issue.minimum}`;
      return undefined;
    case 'too_big':
      if (issue.origin === 'string') return `Must be at most ${issue.maximum} characters`;
      if (issue.origin === 'array') return `No more than ${issue.maximum} allowed`;
      return undefined;
    case 'invalid_format':
      if (issue.format === 'email') return 'Enter a valid email address';
      if (issue.format === 'url') return 'Enter a valid URL';
      return undefined;
    default:
      return undefined;
  }
};
