import Image from 'next/image';

export type IconValue = { kind: 'emoji'; value: string } | { kind: 'image'; src: string; alt: string };

export function Icon({ icon, size = 24 }: { icon: IconValue | null | undefined; size?: number }) {
  if (!icon) return null;
  if (icon.kind === 'emoji') {
    return (
      <span aria-hidden="true" style={{ fontSize: size }}>
        {icon.value}
      </span>
    );
  }
  return <Image src={icon.src} alt={icon.alt} width={size} height={size} />;
}
