// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/admin/posts' }));

import { AdminNav } from '@/components/admin/AdminNav';

afterEach(cleanup);
const labels = (c: HTMLElement) => [...c.querySelectorAll('a')].map((a) => a.textContent);

describe('AdminNav', () => {
  it('hides admin-only screens from marketing', () => {
    const { container } = render(<AdminNav role="marketing" />);
    expect(labels(container)).toEqual(expect.arrayContaining(['Dashboard', 'Posts', 'Media', 'Profile']));
    expect(labels(container)).not.toContain('Users');
    expect(labels(container)).not.toContain('Settings');
  });

  it('shows everything to admins and marks the current page', () => {
    const { container } = render(<AdminNav role="admin" />);
    expect(labels(container)).toEqual(expect.arrayContaining(['Users', 'Settings']));
    expect(container.querySelector('a[aria-current="page"]')?.textContent).toBe('Posts');
  });
});
