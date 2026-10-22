'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveSettingsAction } from '@/app/admin/(panel)/settings/actions';
import type { SiteSettings } from '@/lib/content/settings';
import { Field } from './Field';
import { MediaPicker } from './MediaPicker';
import { RepeatableField } from './RepeatableField';

type Link = { label: string; href: string };
type Office = SiteSettings['organization']['offices'][number];
type NavItem = SiteSettings['headerNav'][number];
const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

// One card per settings section, each saved on its own.
function Section({ title, section, value, children }: { title: string; section: string; value: () => unknown; children: React.ReactNode }) {
  const router = useRouter();
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const id = `set-${section}`;
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMsg('');
    const r = await saveSettingsAction({ section, value: value() });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setMsg('Saved');
    router.refresh();
  }
  return (
    <form onSubmit={submit} className="adm-card adm-stack" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {children}
      <div className="adm-row">
        <button type="submit" className="adm-btn adm-btn-primary" disabled={busy}>
          Save {title.toLowerCase()}
        </button>
        <span role="status" className="adm-ok">
          {msg}
        </span>
      </div>
      {error && (
        <p role="alert" className="adm-error">
          {error}
        </p>
      )}
    </form>
  );
}

function LinkList({ legend, items, onChange, max = 20 }: { legend: string; items: Link[]; onChange: (l: Link[]) => void; max?: number }) {
  return (
    <RepeatableField
      legend={legend}
      items={items}
      onChange={onChange}
      empty={() => ({ label: '', href: '' })}
      addLabel={`Add link to ${legend.toLowerCase()}`}
      max={max}
      render={(l, set, i) => (
        <div className="adm-grid">
          <Field label={`${legend} link ${i + 1} text`}>
            <input value={l.label} onChange={(e) => set({ ...l, label: e.target.value })} maxLength={200} />
          </Field>
          <Field label={`${legend} link ${i + 1} address`} hint="/page, https://…, tel: or mailto:">
            <input value={l.href} onChange={(e) => set({ ...l, href: e.target.value })} maxLength={2000} />
          </Field>
        </div>
      )}
    />
  );
}

export function SettingsForms({ initial, canEditNav }: { initial: SiteSettings; canEditNav: boolean }) {
  const [org, setOrg] = useState(initial.organization);
  const [logo, setLogo] = useState(initial.logo);
  const [og, setOg] = useState(initial.defaultOgImage);
  const [social, setSocial] = useState(initial.social);
  const [wa, setWa] = useState(initial.whatsapp ?? { number: '', message: '' });
  const [waOn, setWaOn] = useState(initial.whatsapp !== null);
  const [nav, setNav] = useState<NavItem[]>(initial.headerNav);
  const [cta, setCta] = useState<Link>(initial.headerCta ?? { label: '', href: '' });
  const [ctaOn, setCtaOn] = useState(initial.headerCta !== null);
  const [footer, setFooter] = useState(initial.footer);
  const addr = org.address;
  const setAddr = (k: keyof typeof addr, v: string) => setOrg({ ...org, address: { ...addr, [k]: v } });

  return (
    <div className="adm-stack">
      <Section title="Business details" section="organization" value={() => org}>
        <div className="adm-grid">
          <Field label="Business name">
            <input value={org.name} onChange={(e) => setOrg({ ...org, name: e.target.value })} required />
          </Field>
          <Field label="Legal name">
            <input value={org.legalName} onChange={(e) => setOrg({ ...org, legalName: e.target.value })} />
          </Field>
          <Field label="Email">
            <input type="email" value={org.email} onChange={(e) => setOrg({ ...org, email: e.target.value })} />
          </Field>
          <Field label="Phone (for links)" hint="International format, e.g. +15105550100">
            <input value={org.phone} onChange={(e) => setOrg({ ...org, phone: e.target.value })} />
          </Field>
          <Field label="Phone (as shown)">
            <input value={org.phoneDisplay} onChange={(e) => setOrg({ ...org, phoneDisplay: e.target.value })} />
          </Field>
        </div>
        <fieldset className="adm-grid" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="adm-hint">US address (main office)</legend>
          <Field label="Street">
            <input value={addr.street} onChange={(e) => setAddr('street', e.target.value)} />
          </Field>
          <Field label="City">
            <input value={addr.city} onChange={(e) => setAddr('city', e.target.value)} />
          </Field>
          <Field label="State">
            <input value={addr.region} onChange={(e) => setAddr('region', e.target.value)} />
          </Field>
          <Field label="ZIP code">
            <input value={addr.postalCode} onChange={(e) => setAddr('postalCode', e.target.value)} />
          </Field>
        </fieldset>
        <RepeatableField
          legend="Other offices"
          items={org.offices}
          onChange={(offices) => setOrg({ ...org, offices })}
          empty={(): Office => ({ label: 'India office', street: '', city: '', region: '', postalCode: '', country: 'IN', phone: '' })}
          addLabel="Add office"
          max={5}
          render={(f, set, i) => (
            <div className="adm-grid">
              <Field label={`Office ${i + 1} name`}>
                <input value={f.label} onChange={(e) => set({ ...f, label: e.target.value })} maxLength={60} />
              </Field>
              <Field label={`Office ${i + 1} country`}>
                <select value={f.country} onChange={(e) => set({ ...f, country: e.target.value as Office['country'] })}>
                  <option value="IN">India</option>
                  <option value="US">United States</option>
                </select>
              </Field>
              <Field label={`Office ${i + 1} street`}>
                <input value={f.street} onChange={(e) => set({ ...f, street: e.target.value })} />
              </Field>
              <Field label={`Office ${i + 1} city`}>
                <input value={f.city} onChange={(e) => set({ ...f, city: e.target.value })} />
              </Field>
              <Field label={`Office ${i + 1} state`}>
                <input value={f.region} onChange={(e) => set({ ...f, region: e.target.value })} />
              </Field>
              <Field label={`Office ${i + 1} postal code`}>
                <input value={f.postalCode} onChange={(e) => set({ ...f, postalCode: e.target.value })} />
              </Field>
              <Field label={`Office ${i + 1} phone`}>
                <input value={f.phone} onChange={(e) => set({ ...f, phone: e.target.value })} />
              </Field>
            </div>
          )}
        />
        <Field label="Opening hours" hint="One per line in schema.org format, e.g. Mo-Fr 09:00-18:00">
          <textarea defaultValue={org.openingHours.join('\n')} onChange={(e) => setOrg({ ...org, openingHours: lines(e.target.value) })} rows={3} />
        </Field>
        <Field label="Business description" hint="Used by search engines, AI answer engines and llms.txt">
          <textarea value={org.description} onChange={(e) => setOrg({ ...org, description: e.target.value })} rows={3} />
        </Field>
      </Section>

      <Section title="Logo" section="logo" value={() => logo}>
        <MediaPicker label="Logo image" value={logo} onChange={setLogo} />
      </Section>
      <Section title="Default social image" section="defaultOgImage" value={() => og}>
        <MediaPicker label="Default share image" value={og} onChange={setOg} />
      </Section>

      <Section title="Social profiles" section="social" value={() => social}>
        <RepeatableField
          legend="Profiles"
          items={social}
          onChange={setSocial}
          empty={() => ({ network: 'linkedin' as const, url: '' })}
          addLabel="Add profile"
          max={4}
          render={(p, set, i) => (
            <div className="adm-grid">
              <Field label={`Profile ${i + 1} network`}>
                <select value={p.network} onChange={(e) => set({ ...p, network: e.target.value as typeof p.network })}>
                  <option value="linkedin">LinkedIn</option>
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                  <option value="x">X</option>
                </select>
              </Field>
              <Field label={`Profile ${i + 1} URL`}>
                <input type="url" value={p.url} onChange={(e) => set({ ...p, url: e.target.value })} placeholder="https://" />
              </Field>
            </div>
          )}
        />
      </Section>

      <Section title="WhatsApp button" section="whatsapp" value={() => (waOn ? wa : null)}>
        <label className="adm-check">
          <input type="checkbox" checked={waOn} onChange={(e) => setWaOn(e.target.checked)} />
          Show the floating WhatsApp button
        </label>
        {waOn && (
          <div className="adm-grid">
            <Field label="WhatsApp number" hint="Digits only, with country code, e.g. 15105550100">
              <input value={wa.number} onChange={(e) => setWa({ ...wa, number: e.target.value.replace(/\D/g, '') })} inputMode="numeric" />
            </Field>
            <Field label="Prefilled message">
              <input value={wa.message} onChange={(e) => setWa({ ...wa, message: e.target.value })} maxLength={500} />
            </Field>
          </div>
        )}
      </Section>

      {canEditNav && (
        <>
          <Section title="Header menu" section="headerNav" value={() => nav.map((n) => (n.children?.length ? n : { label: n.label, href: n.href }))}>
            <RepeatableField
              legend="Menu items"
              items={nav}
              onChange={setNav}
              empty={(): NavItem => ({ label: '', href: '' })}
              addLabel="Add menu item"
              max={12}
              render={(n, set, i) => (
                <>
                  <div className="adm-grid">
                    <Field label={`Menu item ${i + 1} text`}>
                      <input value={n.label} onChange={(e) => set({ ...n, label: e.target.value })} />
                    </Field>
                    <Field label={`Menu item ${i + 1} address`}>
                      <input value={n.href} onChange={(e) => set({ ...n, href: e.target.value })} />
                    </Field>
                  </div>
                  <RepeatableField
                    legend={`Dropdown under item ${i + 1}`}
                    items={n.children ?? []}
                    onChange={(children) => set({ ...n, children })}
                    empty={() => ({ label: '', subtitle: '', href: '' })}
                    addLabel={`Add dropdown link to item ${i + 1}`}
                    max={12}
                    render={(c, setC, j) => (
                      <div className="adm-grid">
                        <Field label={`Item ${i + 1} dropdown ${j + 1} text`}>
                          <input value={c.label} onChange={(e) => setC({ ...c, label: e.target.value })} />
                        </Field>
                        <Field label={`Item ${i + 1} dropdown ${j + 1} subtitle`}>
                          <input value={c.subtitle ?? ''} onChange={(e) => setC({ ...c, subtitle: e.target.value })} />
                        </Field>
                        <Field label={`Item ${i + 1} dropdown ${j + 1} address`}>
                          <input value={c.href} onChange={(e) => setC({ ...c, href: e.target.value })} />
                        </Field>
                      </div>
                    )}
                  />
                </>
              )}
            />
          </Section>

          <Section title="Header button" section="headerCta" value={() => (ctaOn ? cta : null)}>
            <label className="adm-check">
              <input type="checkbox" checked={ctaOn} onChange={(e) => setCtaOn(e.target.checked)} />
              Show a button at the end of the header
            </label>
            {ctaOn && (
              <div className="adm-grid">
                <Field label="Button text">
                  <input value={cta.label} onChange={(e) => setCta({ ...cta, label: e.target.value })} />
                </Field>
                <Field label="Button address">
                  <input value={cta.href} onChange={(e) => setCta({ ...cta, href: e.target.value })} />
                </Field>
              </div>
            )}
          </Section>

          <Section title="Footer" section="footer" value={() => footer}>
            <Field label="Footer description">
              <textarea value={footer.description} onChange={(e) => setFooter({ ...footer, description: e.target.value })} rows={2} />
            </Field>
            <RepeatableField
              legend="Footer columns"
              items={footer.columns}
              onChange={(columns) => setFooter({ ...footer, columns })}
              empty={() => ({ title: '', links: [] })}
              addLabel="Add column"
              max={4}
              render={(c, set, i) => (
                <>
                  <Field label={`Column ${i + 1} heading`}>
                    <input value={c.title} onChange={(e) => set({ ...c, title: e.target.value })} />
                  </Field>
                  <LinkList legend={`Column ${i + 1}`} items={c.links} onChange={(links) => set({ ...c, links })} />
                </>
              )}
            />
            <Field label="Copyright line">
              <input value={footer.copyright} onChange={(e) => setFooter({ ...footer, copyright: e.target.value })} />
            </Field>
            <LinkList legend="Legal" items={footer.legalLinks} onChange={(legalLinks) => setFooter({ ...footer, legalLinks })} max={6} />
          </Section>
        </>
      )}
    </div>
  );
}
