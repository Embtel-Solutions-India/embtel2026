// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { renderInline } from '@/lib/content/inline';
import { Button } from '@/components/site/Button';
import { Icon } from '@/components/site/Icon';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

describe('renderInline never emits HTML', () => {
  it('turns *x* into an emphasis and leaves markup as text', () => {
    const { container } = render(<p>{renderInline('Hello *world* <script>x</script>')}</p>);
    expect(container.textContent).toBe('Hello world <script>x</script>');
    expect(container.querySelectorAll('em')).toHaveLength(1);
    expect(container.querySelector('em')?.textContent).toBe('world');
    expect(container.querySelectorAll('script')).toHaveLength(0);
  });

  it('leaves a lone asterisk literal', () => {
    const { container } = render(<p>{renderInline('a * b')}</p>);
    expect(container.querySelectorAll('em')).toHaveLength(0);
    expect(container.textContent).toBe('a * b');
  });

  it('supports several emphases', () => {
    const { container } = render(<p>{renderInline('*a* and *b*')}</p>);
    expect(container.querySelectorAll('em')).toHaveLength(2);
  });
});

describe('Button', () => {
  it('neutralises javascript: hrefs', () => {
    const { container } = render(<Button label="x" href="javascript:alert(1)" />);
    expect(container.querySelector('a')?.getAttribute('href')).toBe('#');
  });

  it('adds rel=noopener to external links', () => {
    const { container } = render(<Button label="Book" href="https://api.leadconnectorhq.com/widget/booking/x" />);
    expect(container.querySelector('a')?.getAttribute('rel')).toBe('noopener');
  });

  it('keeps tel: and internal links', () => {
    const { container } = render(
      <>
        <Button label="Call" href="tel:+15109627900" />
        <Button label="Work" href="/work" variant="ghost" />
      </>,
    );
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['tel:+15109627900', '/work']);
  });
});

describe('Icon', () => {
  it('renders nothing for null', () => {
    const { container } = render(<Icon icon={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders an emoji as decorative text', () => {
    const { container } = render(<Icon icon={{ kind: 'emoji', value: '✉️' }} />);
    expect(container.querySelector('[aria-hidden="true"]')?.textContent).toBe('✉️');
  });
});
