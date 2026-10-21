'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { NavItem } from '@/lib/content/settings';
import type { Link as LinkT } from '@/lib/content/links';

const isActive = (item: NavItem, path: string) =>
  path === item.href || (item.children ?? []).some((c) => c.href === path);

const Chevron = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
    <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function Dropdown({ item, path }: { item: NavItem; path: string }) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const id = `nav-${item.label.toLowerCase().replace(/\W+/g, '-')}`;
  const active = isActive(item, path);

  return (
    <li
      className="group relative flex items-center gap-1"
      onMouseLeave={() => setOpen(false)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          setOpen(false);
          toggle.current?.focus();
        }
      }}
    >
      <Link
        href={item.href}
        data-active={active}
        className="text-[13.5px] font-medium text-m2 transition-colors hover:text-white data-[active=true]:font-semibold data-[active=true]:text-white"
      >
        {item.label}
      </Link>
      <button
        ref={toggle}
        type="button"
        aria-label={`${item.label} menu`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="p-1 text-m2 hover:text-white"
      >
        <span className={`block transition-transform ${open ? 'rotate-180' : ''}`}>
          <Chevron />
        </span>
      </button>
      <div
        id={id}
        className={`absolute left-1/2 top-[calc(100%+8px)] z-[1000] grid min-w-[580px] -translate-x-1/2 grid-cols-2 gap-1.5 rounded-[16px] border border-white/[.08] bg-[rgba(13,13,16,.97)] p-3 shadow-[0_8px_32px_rgba(0,0,0,.4)] backdrop-blur-[24px] transition-opacity before:absolute before:-top-2 before:left-0 before:right-0 before:h-2 ${
          open ? 'visible opacity-100' : 'invisible opacity-0 group-hover:visible group-hover:opacity-100'
        }`}
      >
        {item.children!.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            aria-current={c.href === path ? 'page' : undefined}
            className="rounded-[10px] px-3.5 py-3 text-m3 transition-colors hover:bg-white/[.08]"
          >
            <strong className="mb-0.5 block text-[13px] font-semibold text-white">{c.label}</strong>
            {c.subtitle && <small className="text-[11.5px] leading-snug text-m1">{c.subtitle}</small>}
          </Link>
        ))}
      </div>
    </li>
  );
}

export function HeaderMenu({ nav, cta }: { nav: NavItem[]; cta: LinkT | null }) {
  const path = usePathname();
  // The menu is open only for the path it was opened on, so any navigation closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const mobileOpen = openOn === path;
  const setMobileOpen = (open: boolean | ((o: boolean) => boolean)) =>
    setOpenOn((typeof open === 'function' ? open(mobileOpen) : open) ? path : null);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenOn(null);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  return (
    <>
      <ul className="flex items-center gap-9 max-lg:hidden">
        {nav.map((item) =>
          item.children?.length ? (
            <Dropdown key={item.href} item={item} path={path} />
          ) : (
            <li key={item.href}>
              <Link
                href={item.href}
                data-active={isActive(item, path)}
                aria-current={item.href === path ? 'page' : undefined}
                className="text-[13.5px] font-medium text-m2 transition-colors hover:text-white data-[active=true]:font-semibold data-[active=true]:text-white"
              >
                {item.label}
              </Link>
            </li>
          ),
        )}
      </ul>
      {cta && (
        <a
          href={cta.href}
          rel="noopener"
          className="rounded-8 bg-blue px-[22px] py-[9px] text-[13.5px] font-semibold text-white transition-all hover:-translate-y-px hover:bg-[#3b7fff] max-lg:hidden"
        >
          {cta.label}
        </a>
      )}
      <button
        type="button"
        aria-label="Menu"
        aria-expanded={mobileOpen}
        aria-controls="mobile-menu"
        onClick={() => setMobileOpen((o) => !o)}
        className="flex flex-col gap-[5px] p-2 lg:hidden"
      >
        {[0, 1, 2].map((i) => (
          <span key={i} className="block h-0.5 w-[22px] rounded-sm bg-m3" />
        ))}
      </button>
      <div
        id="mobile-menu"
        role="dialog"
        aria-label="Site menu"
        hidden={!mobileOpen}
        className="fixed inset-x-0 bottom-0 top-[68px] z-[998] flex-col items-center gap-1.5 overflow-y-auto bg-[rgba(9,9,11,.97)] px-0 pb-25 pt-9 backdrop-blur-[20px] [&:not([hidden])]:flex lg:hidden"
      >
        {nav.map((item) => (
          <div key={item.href} className="flex flex-col items-center">
            <Link
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="rounded-8 px-6 py-2 font-display text-[26px] font-bold text-white hover:text-teal"
            >
              {item.label}
            </Link>
            {item.children?.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                onClick={() => setMobileOpen(false)}
                className="px-6 py-1.5 text-[17px] font-semibold text-m2 hover:text-teal"
              >
                {c.label}
              </Link>
            ))}
          </div>
        ))}
        {cta && (
          <a href={cta.href} rel="noopener" className="mt-4 rounded-14 bg-blue px-8 py-3.5 font-semibold text-white">
            {cta.label}
          </a>
        )}
      </div>
    </>
  );
}
