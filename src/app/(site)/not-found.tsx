import { Button } from '@/components/site/Button';

export default function NotFound() {
  return (
    <section className="svc-hero">
      <div className="svc-hero-in">
        <p className="mb-3.5 text-[11.5px] font-bold uppercase tracking-[2px] text-ac">404</p>
        <h1 className="h1">
          This page <em className="text-gradient not-italic">doesn&apos;t exist</em>
        </h1>
        <p className="svc-lead">The page may have moved. Head back home or tell us what you were looking for.</p>
        <div className="btn-row">
          <Button label="Go home" href="/" />
          <Button label="Contact us" href="/contact" variant="ghost" />
        </div>
      </div>
    </section>
  );
}
